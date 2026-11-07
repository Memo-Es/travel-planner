import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

/** Who's on the sample trip: the new user and three pretend travel buddies. */
type Who = "me" | "sofia" | "kenji" | "ama";

const PALS: { key: Exclude<Who, "me">; name: string }[] = [
  { key: "sofia", name: "Sofía" },
  { key: "kenji", name: "Kenji" },
  { key: "ama", name: "Ama" },
];

type SampleItem = {
  section: "STAY" | "TRANSPORT" | "ACTIVITIES";
  title: string;
  url?: string;
  costAmount?: number;
  /** Days after the stop's arrival. */
  day?: number;
  time?: string;
  notes?: string;
  paidBy?: Who;
  /** Who signed up for an activity; nobody means everyone splits it. */
  going?: Who[];
};

type SampleStop = {
  label: string;
  color: string;
  /** Days after the trip starts. */
  from: number;
  nights: number;
  items: SampleItem[];
};

/** A Barcelona → Copenhagen trip with bookings, plans and who paid for what,
 * so a new account opens on something to explore rather than a blank page. */
const STOPS: SampleStop[] = [
  {
    label: "Barcelona",
    color: "clay",
    from: 0,
    nights: 3,
    items: [
      {
        section: "STAY",
        title: "Casa Bonay, Eixample",
        url: "https://casabonay.com",
        costAmount: 410,
        day: 0,
        time: "15:00",
        paidBy: "me",
      },
      {
        section: "TRANSPORT",
        title: "Flight MAD → BCN",
        url: "https://iberia.com",
        costAmount: 92,
        day: 0,
        time: "09:40",
        paidBy: "sofia",
      },
      {
        section: "ACTIVITIES",
        title: "Sagrada Família, towers tour",
        costAmount: 120,
        day: 1,
        time: "10:00",
        notes: "Timed entry, bring the QR codes.",
        paidBy: "kenji",
        going: ["me", "kenji", "ama"],
      },
      {
        section: "ACTIVITIES",
        title: "Tapas crawl in El Born",
        costAmount: 96,
        day: 1,
        time: "20:30",
        paidBy: "ama",
      },
      {
        section: "ACTIVITIES",
        title: "Bunkers del Carmel at sunset",
        day: 2,
        time: "18:15",
      },
    ],
  },
  {
    label: "Paris",
    color: "lavender",
    from: 3,
    nights: 3,
    items: [
      {
        section: "STAY",
        title: "Hôtel du Temps, 9e",
        url: "https://hotel-du-temps.fr",
        costAmount: 520,
        day: 0,
        time: "16:00",
        paidBy: "kenji",
      },
      {
        section: "TRANSPORT",
        title: "Navigo pass, 3 days",
        costAmount: 31,
        paidBy: "me",
      },
      {
        section: "TRANSPORT",
        title: "Thalys Paris → Brussels",
        url: "https://sncf-connect.com",
        costAmount: 58,
        day: 3,
        time: "11:25",
        paidBy: "sofia",
      },
      {
        section: "ACTIVITIES",
        title: "Musée d'Orsay",
        costAmount: 64,
        day: 1,
        time: "09:30",
        notes: "Enter by Access 1 on the quay.",
        paidBy: "sofia",
        going: ["me", "sofia"],
      },
      {
        section: "ACTIVITIES",
        title: "Picnic at Canal Saint-Martin",
        day: 1,
        time: "13:00",
      },
      {
        section: "ACTIVITIES",
        title: "Dinner at Le Comptoir",
        costAmount: 180,
        day: 2,
        time: "20:00",
        paidBy: "me",
      },
    ],
  },
  {
    label: "Belgium",
    color: "khaki",
    from: 6,
    nights: 2,
    items: [
      {
        section: "STAY",
        title: "Hotel Amigo, Brussels",
        costAmount: 300,
        day: 0,
        time: "15:00",
        paidBy: "ama",
      },
      {
        section: "TRANSPORT",
        title: "IC Brussels → Amsterdam",
        url: "https://belgiantrain.be",
        costAmount: 45,
        day: 2,
        time: "10:12",
        paidBy: "kenji",
      },
      {
        section: "ACTIVITIES",
        title: "Day trip to Bruges",
        costAmount: 72,
        day: 1,
        time: "09:00",
        paidBy: "ama",
        going: ["sofia", "kenji", "ama"],
      },
    ],
  },
  {
    label: "Amsterdam",
    color: "sage",
    from: 8,
    nights: 4,
    items: [
      {
        section: "STAY",
        title: "Volkshotel, Oost",
        costAmount: 560,
        day: 0,
        time: "15:00",
        paidBy: "sofia",
      },
      {
        section: "TRANSPORT",
        title: "Airport transfer",
        url: "https://schiphol.nl",
        costAmount: 18,
        paidBy: "me",
      },
      {
        section: "ACTIVITIES",
        title: "Rijksmuseum",
        costAmount: 88,
        day: 1,
        time: "10:00",
        notes: "Tickets are timed, arrive 15 min early.",
        paidBy: "me",
        going: ["me", "sofia", "kenji"],
      },
      {
        section: "ACTIVITIES",
        title: "Canal boat at golden hour",
        costAmount: 76,
        day: 1,
        time: "17:30",
        paidBy: "kenji",
      },
      {
        section: "ACTIVITIES",
        title: "Vondelpark bike loop",
        day: 2,
        time: "11:00",
      },
      {
        section: "ACTIVITIES",
        title: "Indonesian rijsttafel",
        costAmount: 140,
        day: 3,
        time: "19:30",
        paidBy: "ama",
      },
    ],
  },
  {
    label: "Hamburg",
    color: "stone",
    from: 12,
    nights: 2,
    items: [
      {
        section: "STAY",
        title: "25hours HafenCity",
        url: "https://25hours-hotels.com",
        costAmount: 390,
        day: 0,
        time: "15:00",
        paidBy: "me",
      },
      {
        section: "TRANSPORT",
        title: "Train Hamburg → Copenhagen",
        url: "https://bahn.de",
        costAmount: 79,
        day: 2,
        time: "09:18",
        paidBy: "ama",
      },
      {
        section: "ACTIVITIES",
        title: "Elbphilharmonie plaza",
        day: 1,
        time: "11:00",
      },
      {
        section: "ACTIVITIES",
        title: "Fish market breakfast",
        costAmount: 48,
        day: 1,
        time: "07:30",
        paidBy: "sofia",
        going: ["sofia", "ama"],
      },
    ],
  },
  {
    label: "Copenhagen",
    color: "lavender",
    from: 14,
    nights: 3,
    items: [
      {
        section: "STAY",
        title: "Hotel Sanders",
        costAmount: 680,
        day: 0,
        time: "15:00",
        paidBy: "kenji",
      },
      {
        section: "TRANSPORT",
        title: "Flight CPH → MAD",
        url: "https://sas.se",
        costAmount: 134,
        day: 3,
        time: "18:05",
        paidBy: "me",
      },
      {
        section: "ACTIVITIES",
        title: "Nyhavn and the Little Mermaid",
        day: 1,
        time: "10:30",
      },
      {
        section: "ACTIVITIES",
        title: "Tivoli Gardens",
        costAmount: 104,
        day: 1,
        time: "17:00",
        paidBy: "sofia",
      },
      {
        section: "ACTIVITIES",
        title: "Sauna and harbour swim",
        costAmount: 60,
        day: 2,
        time: "08:00",
        paidBy: "ama",
        going: ["me", "ama"],
      },
    ],
  },
];

const DAY_MS = 86_400_000;

/** Creates the sample trip workspace, with its pretend travel buddies, and
 * returns its team id and who plays "me" in it. The trip starts three weeks
 * from today so it always reads as upcoming.
 *
 * `userId` is the real account that owns it - the signup flow's own user,
 * run inside its transaction. Pass null for a trip with no real owner at
 * all: a pretend "You" is created to play that part instead, which is what
 * the one shared public demo at `/` uses, since nobody is signed in to own
 * it. */
export async function seedSampleTrip(
  tx: Prisma.TransactionClient,
  userId: string | null,
  options: { isPublicDemo?: boolean } = {},
): Promise<{ teamId: string; meId: string }> {
  const now = new Date();
  const start =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) +
    21 * DAY_MS;
  const day = (offset: number) => new Date(start + offset * DAY_MS);

  // Pretend buddies can't sign in: their password is random and never kept.
  const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
  let meId = userId;
  if (meId === null) {
    const me = await tx.user.create({
      data: {
        name: "You",
        email: `sample-you-${randomBytes(8).toString("hex")}@example.invalid`,
        passwordHash,
        isSample: true,
        onboardedAt: now,
      },
    });
    meId = me.id;
  }
  const people: Record<Who, string> = {
    me: meId,
    sofia: "",
    kenji: "",
    ama: "",
  };
  for (const pal of PALS) {
    const user = await tx.user.create({
      data: {
        name: pal.name,
        email: `sample-${pal.key}-${randomBytes(8).toString("hex")}@example.invalid`,
        passwordHash,
        isSample: true,
        onboardedAt: now,
      },
    });
    people[pal.key] = user.id;
  }

  const team = await tx.team.create({
    data: {
      name: "Sample trip · Europe",
      isSample: true,
      isPublicDemo: options.isPublicDemo ?? false,
      memberships: {
        create: [
          { userId: meId, role: "OWNER" },
          ...PALS.map((p) => ({
            userId: people[p.key],
            role: "MEMBER" as const,
          })),
        ],
      },
    },
  });

  for (const [order, stop] of STOPS.entries()) {
    // Expenses are their own rows, with both a tripId and an itemId to set -
    // one nested create can only fill in the direct parent (the item), so
    // the trip and its items are created first and the costs follow once
    // their ids exist.
    const trip = await tx.trip.create({
      data: {
        teamId: team.id,
        label: stop.label,
        color: stop.color,
        start: day(stop.from),
        end: day(stop.from + stop.nights),
        order,
        items: {
          create: stop.items.map((item, i) => ({
            section: item.section,
            title: item.title,
            url: item.url ?? "",
            date: item.day === undefined ? null : day(stop.from + item.day),
            time: item.time ?? null,
            notes: item.notes ?? null,
            order: i,
            attendees: item.going
              ? { create: item.going.map((w) => ({ userId: people[w] })) }
              : undefined,
          })),
        },
      },
      include: { items: true },
    });
    const expenses = stop.items.flatMap((item, i) =>
      item.costAmount === undefined
        ? []
        : [
            {
              tripId: trip.id,
              itemId: trip.items[i].id,
              title: item.title,
              amount: item.costAmount,
              paidById: item.paidBy ? people[item.paidBy] : null,
            },
          ],
    );
    if (expenses.length) await tx.expense.createMany({ data: expenses });
  }
  return { teamId: team.id, meId };
}
