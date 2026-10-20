import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { lookupDestinationPhoto } from "@/lib/photo";
import { removeFile } from "@/lib/storage";
import { CORS_HEADERS, MCP_PATH, originOf, verifyAccessToken } from "@/lib/oauth";
import { checkPlace } from "@/lib/places";
import {
  addItemToStop,
  colorSchema,
  dateStringSchema,
  itemAccess,
  moveItemToDay,
  setAttendance,
  stopAccess,
  stopLabelSchema,
  teamAccess,
  timeStringSchema,
  toItemData,
} from "@/lib/planner";

// The MCP server: what Claude, ChatGPT and any other MCP client talk to once
// someone has connected it with their account (see lib/oauth.ts). Stateless,
// so every request builds its own server and nothing is kept between them,
// which is what a serverless function needs.

export const dynamic = "force-dynamic";

const INSTRUCTIONS = `Travel Planner holds trips that people plan together.

A trip (for example "Europe 2026") has stops: a place with a first and last day, like "Barcelona, 10 to 13 Nov". Each stop has plans in three sections: stay (where they sleep), transport (flights, trains, transfers) and activities. A plan has a title and can have a day within its stop, a local start time, a cost in the trip's currency, a link and a short note. People on the trip sign up for the plans they're going to, so a group can split up; set_going signs up the person you're helping, never anyone else.

Start with get_trips to see what exists and get ids. When asked to plan something, add stops and plans rather than replacing what is there, keep a plan's day inside its stop's dates (change the stop's dates first if needed), and only delete a plan when the person asks for it. Dates are YYYY-MM-DD and times are 24 hour HH:mm, local to the place.

check_place looks up a real place by name (include the city, e.g. "Disfrutar, Barcelona") and returns whether it's actually open, its phone number, rating and a booking hint - real facts, not a guess, so use it before holding or recommending somewhere rather than trusting what you already think you know about it. This server still can't check a specific table or time slot, or book anything itself. If you have your own way to do that (browsing, a connector), use it, and the usual rule changes by whether it costs money. For something free to hold - a restaurant table, a museum slot, anything with no deposit or card required - go ahead and secure it once you've confirmed it's actually available, then record it here with add_plan or update_plan (title, the real time, its link, and a note with the confirmation or what it needs); a popular table can be gone by the time you'd ask, so confirming and holding it is the useful thing to do, not a question to raise first. The moment payment is involved - a deposit, a card on file, a non-refundable fare - stop and tell the person what you found instead of completing it, and recording an option you haven't booked as a note on the plan is often the more honest result than marking it Scheduled.`;

const SECTIONS = {
  stay: "STAY",
  transport: "TRANSPORT",
  activity: "ACTIVITIES",
} as const;
const SECTION_NAMES = { STAY: "stay", TRANSPORT: "transport", ACTIVITIES: "activity" } as const;

const day = (d: Date) => d.toISOString().slice(0, 10);

function result(message: string, data?: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: data === undefined ? message : `${message}\n\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

/** Runs a tool, turning validation and access errors into a plain message
 * the model can act on instead of a stack trace. */
function tool<A>(fn: (args: A) => Promise<ReturnType<typeof result>>) {
  return async (args: A) => {
    try {
      return await fn(args);
    } catch (error) {
      const message =
        error instanceof ZodError
          ? error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")
          : error instanceof Error
            ? error.message
            : "Something went wrong";
      return { ...result(message), isError: true };
    }
  };
}

function inStop(date: string | null, stop: { start: Date; end: Date; label: string }) {
  if (date && (date < day(stop.start) || date > day(stop.end))) {
    throw new Error(
      `${date} is outside ${stop.label} (${day(stop.start)} to ${day(stop.end)}). Use a day of the stop, or change the stop's dates with update_stop first.`,
    );
  }
}

function buildServer(userId: string) {
  const server = new McpServer(
    { name: "travel-planner", title: "Travel Planner", version: "1.0.0" },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    "get_trips",
    {
      title: "Get trips",
      description:
        "Lists the trips this person is part of, each with its currency, its people and its stops in order, and each stop's plans by section with their ids, days, times, costs, links and who's going. Pass trip_id to get one trip.",
      inputSchema: {
        trip_id: z.string().optional().describe("Only this trip"),
      },
      annotations: { readOnlyHint: true },
    },
    tool(async ({ trip_id }: { trip_id?: string }) => {
      const memberships = await prisma.membership.findMany({
        where: { userId, ...(trip_id ? { teamId: trip_id } : {}) },
        orderBy: { createdAt: "asc" },
        include: {
          team: {
            include: {
              memberships: {
                orderBy: { createdAt: "asc" },
                select: { user: { select: { id: true, name: true } } },
              },
              trips: {
                orderBy: { order: "asc" },
                include: {
                  items: {
                    orderBy: { order: "asc" },
                    include: {
                      _count: { select: { attachments: true } },
                      attendees: {
                        orderBy: { createdAt: "asc" },
                        select: { user: { select: { name: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (trip_id && memberships.length === 0) {
        throw new Error("No trip with that id, or this person isn't part of it");
      }
      const trips = memberships.map(({ team }) => ({
        trip_id: team.id,
        name: team.name,
        currency: team.currency,
        people: team.memberships.map((m) =>
          m.user.id === userId ? `${m.user.name} (you)` : m.user.name,
        ),
        stops: team.trips.map((stop) => ({
          stop_id: stop.id,
          name: stop.label,
          start: day(stop.start),
          end: day(stop.end),
          color: stop.color,
          plans: stop.items.map((item) => ({
            plan_id: item.id,
            section: SECTION_NAMES[item.section],
            title: item.title,
            date: item.date ? day(item.date) : null,
            time: item.time,
            cost: item.costAmount,
            link: item.url || null,
            notes: item.notes,
            attachments: item._count.attachments,
            going: item.attendees.map((a) => a.user.name),
          })),
        })),
      }));
      return result(
        trips.length === 1 ? "1 trip" : `${trips.length} trips`,
        trips,
      );
    }),
  );

  server.registerTool(
    "add_stop",
    {
      title: "Add a stop",
      description:
        "Adds a stop to a trip: a place with a first and last day. It goes after the trip's other stops.",
      inputSchema: {
        trip_id: z.string(),
        name: z.string().describe('The place, e.g. "Lisbon"'),
        start: z.string().describe("First day, YYYY-MM-DD"),
        end: z.string().describe("Last day, YYYY-MM-DD"),
        color: colorSchema.optional().describe("Defaults to the first color"),
      },
    },
    tool(async (args: { trip_id: string; name: string; start: string; end: string; color?: string }) => {
      await teamAccess(userId, args.trip_id);
      const label = stopLabelSchema.parse(args.name);
      const start = dateStringSchema.parse(args.start);
      const end = dateStringSchema.parse(args.end);
      if (end < start) throw new Error("end can't be before start");
      const count = await prisma.trip.count({ where: { teamId: args.trip_id } });
      const stop = await prisma.trip.create({
        data: {
          teamId: args.trip_id,
          label,
          start: new Date(start),
          end: new Date(end),
          color: args.color ? colorSchema.parse(args.color) : null,
          photoUrl: await lookupDestinationPhoto(label),
          order: count,
        },
      });
      revalidatePath("/");
      return result(`Added ${label}`, { stop_id: stop.id });
    }),
  );

  server.registerTool(
    "update_stop",
    {
      title: "Change a stop",
      description:
        "Renames a stop or changes its days or color. Leave out what stays the same. Plans on days that fall outside the new dates move to the stop's No day yet list.",
      inputSchema: {
        stop_id: z.string(),
        name: z.string().optional(),
        start: z.string().optional().describe("YYYY-MM-DD"),
        end: z.string().optional().describe("YYYY-MM-DD"),
        color: colorSchema.optional(),
      },
      annotations: { idempotentHint: true },
    },
    tool(async (args: { stop_id: string; name?: string; start?: string; end?: string; color?: string }) => {
      const stop = await stopAccess(userId, args.stop_id);
      const start = dateStringSchema.parse(args.start ?? day(stop.start));
      const end = dateStringSchema.parse(args.end ?? day(stop.end));
      if (end < start) throw new Error("end can't be before start");
      const label = args.name === undefined ? stop.label : stopLabelSchema.parse(args.name);
      await prisma.trip.update({
        where: { id: stop.id },
        data: {
          label,
          start: new Date(start),
          end: new Date(end),
          ...(args.color ? { color: colorSchema.parse(args.color) } : {}),
          ...(label !== stop.label ? { photoUrl: await lookupDestinationPhoto(label) } : {}),
        },
      });
      revalidatePath("/");
      return result(`Updated ${label}`);
    }),
  );

  server.registerTool(
    "add_plan",
    {
      title: "Add a plan",
      description:
        "Adds a plan to a stop: somewhere to stay, a way to get there or around, or an activity. Give it a day within the stop when it has one.",
      inputSchema: {
        stop_id: z.string(),
        section: z.enum(["stay", "transport", "activity"]),
        title: z.string().describe('e.g. "Sagrada Familia" or "Train to Porto"'),
        date: z.string().optional().describe("Day within the stop, YYYY-MM-DD"),
        time: z.string().optional().describe("Local start time, HH:mm, needs a date"),
        cost: z.number().optional().describe("In the trip's currency"),
        link: z.string().optional().describe("Booking or info page, http(s)"),
        notes: z.string().optional().describe("A short note, e.g. booking details or a reminder"),
      },
    },
    tool(async (args: {
      stop_id: string;
      section: keyof typeof SECTIONS;
      title: string;
      date?: string;
      time?: string;
      cost?: number;
      link?: string;
      notes?: string;
    }) => {
      const stop = await stopAccess(userId, args.stop_id);
      inStop(args.date ?? null, stop);
      if (args.time && !args.date) throw new Error("A time needs a date");
      const id = await addItemToStop(stop.id, SECTIONS[args.section], {
        title: args.title,
        url: args.link ?? "",
        costAmount: args.cost ?? null,
        date: args.date ?? null,
        time: args.time ?? null,
        notes: args.notes ?? null,
      });
      revalidatePath("/");
      return result(`Added ${args.title.trim()} to ${stop.label}`, { plan_id: id });
    }),
  );

  server.registerTool(
    "update_plan",
    {
      title: "Change a plan",
      description:
        "Changes a plan's title, day, time, cost or link. Leave out what stays the same, and pass null to clear a day, time, cost or link.",
      inputSchema: {
        plan_id: z.string(),
        title: z.string().optional(),
        date: dateStringSchema.nullable().optional(),
        time: timeStringSchema.nullable().optional(),
        cost: z.number().nullable().optional(),
        link: z.string().nullable().optional(),
        notes: z.string().nullable().optional().describe("Pass null to clear it"),
      },
      annotations: { idempotentHint: true },
    },
    tool(async (args: {
      plan_id: string;
      title?: string;
      date?: string | null;
      time?: string | null;
      cost?: number | null;
      link?: string | null;
      notes?: string | null;
    }) => {
      const item = await itemAccess(userId, args.plan_id);
      const date = args.date === undefined ? (item.date ? day(item.date) : null) : args.date;
      inStop(date, item.trip);
      const time = args.time === undefined ? item.time : args.time;
      if (args.time && !date) throw new Error("A time needs a date");
      const data = toItemData({
        title: args.title ?? item.title,
        url: args.link === undefined ? item.url : (args.link ?? ""),
        costAmount: args.cost === undefined ? item.costAmount : args.cost,
        date,
        time,
        notes: args.notes === undefined ? item.notes : args.notes,
      });
      await prisma.tripItem.update({ where: { id: item.id }, data });
      revalidatePath("/");
      return result(`Updated ${data.title}`);
    }),
  );

  server.registerTool(
    "move_plan",
    {
      title: "Move a plan to another day",
      description:
        "Moves a plan to another day of its stop, keeping its time, or to no day with date null, which also clears the time.",
      inputSchema: {
        plan_id: z.string(),
        date: dateStringSchema.nullable().describe("Day within the stop, YYYY-MM-DD, or null"),
      },
      annotations: { idempotentHint: true },
    },
    tool(async ({ plan_id, date }: { plan_id: string; date: string | null }) => {
      const item = await itemAccess(userId, plan_id);
      inStop(date, item.trip);
      await moveItemToDay(item.id, date);
      revalidatePath("/");
      return result(`Moved ${item.title} to ${date ?? "no day"}`);
    }),
  );

  server.registerTool(
    "set_going",
    {
      title: "Sign up for a plan",
      description:
        "Signs this person up for a plan, so the group sees they're going, or takes them off it with going false. It only ever changes this person's own sign up.",
      inputSchema: {
        plan_id: z.string(),
        going: z.boolean(),
      },
      annotations: { idempotentHint: true },
    },
    tool(async ({ plan_id, going }: { plan_id: string; going: boolean }) => {
      const item = await itemAccess(userId, plan_id);
      await setAttendance(userId, item.id, going);
      revalidatePath("/");
      return result(going ? `Going to ${item.title}` : `Not going to ${item.title}`);
    }),
  );

  server.registerTool(
    "check_place",
    {
      title: "Check a real place",
      description:
        "Looks up a real place by name (put the city or area in the query, e.g. \"Disfrutar, Barcelona\") and returns up to 3 matches, each with whether it's open right now, its hours, phone number, rating, price level and a hint on how to book it. Use this before telling someone a place is open, holding a reservation, or recommending somewhere, rather than relying on what you already know about it, since that can be wrong or out of date. Needs a Google Places API key configured on the server; if it isn't, says so plainly instead of guessing.",
      inputSchema: {
        query: z.string().describe('The place and its city or area, e.g. "Disfrutar, Barcelona"'),
      },
      annotations: { readOnlyHint: true },
    },
    tool(async ({ query }: { query: string }) => {
      const places = await checkPlace(query);
      if (places === null) {
        return {
          ...result(
            "This server has no Google Places API key configured, so it can't look up real places. Say so rather than guessing.",
          ),
          isError: true,
        };
      }
      if (places.length === 0) return result(`No match found for "${query}"`);
      return result(
        places.length === 1 ? "1 match" : `${places.length} matches`,
        places,
      );
    }),
  );

  server.registerTool(
    "delete_plan",
    {
      title: "Delete a plan",
      description:
        "Deletes a plan and any files attached to it, for everyone on the trip. Only use it when the person asks.",
      inputSchema: { plan_id: z.string() },
      annotations: { destructiveHint: true },
    },
    tool(async ({ plan_id }: { plan_id: string }) => {
      const item = await itemAccess(userId, plan_id);
      // Stored files go too, the same as deleting from the app.
      const files = await prisma.attachment.findMany({
        where: { itemId: item.id, blobUrl: { not: null } },
        select: { blobUrl: true },
      });
      await prisma.tripItem.delete({ where: { id: item.id } });
      await Promise.allSettled(files.map(removeFile));
      revalidatePath("/");
      return result(`Deleted ${item.title}`);
    }),
  );

  return server;
}

async function handle(req: Request) {
  const origin = originOf(req);
  const challenge = (error?: string) =>
    new Response(JSON.stringify({ error: error ?? "unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
        "WWW-Authenticate":
          `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource${MCP_PATH}"` +
          (error ? `, error="${error}"` : ""),
      },
    });

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return challenge();
  const token = header.slice(7).trim();
  const grant = await verifyAccessToken(token);
  if (!grant) return challenge("invalid_token");

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = buildServer(grant.userId);
  await server.connect(transport);
  const response = await transport.handleRequest(req, {
    authInfo: {
      token,
      clientId: grant.clientId,
      scopes: grant.scope.split(" "),
      expiresAt: Math.floor(grant.accessExpiresAt.getTime() / 1000),
      extra: { userId: grant.userId },
    },
  });
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

export const POST = handle;

// A stateless server has no stream to open and no session to end, and
// answering GET with a stream would hold a serverless function open until it
// times out. 405 is how the spec says "not offered here", and clients carry
// on with POST alone.
function notAllowed() {
  return new Response(null, {
    status: 405,
    headers: { Allow: "POST, OPTIONS", ...CORS_HEADERS },
  });
}
export const GET = notAllowed;
export const DELETE = notAllowed;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
