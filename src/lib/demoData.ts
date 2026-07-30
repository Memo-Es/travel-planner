import type { Prisma } from "@prisma/client";

/** The Barcelona → Copenhagen demo itinerary from the original Claude Design
 * prototype. Seeded onto every new team so first login isn't empty. */
export function demoTrips(teamId: string): Prisma.TripCreateManyInput[] {
  const rows: { id: string; label: string; start: string; end: string }[] = [
    { id: "bcn", label: "Barcelona", start: "2026-11-16", end: "2026-11-19" },
    { id: "par", label: "Paris", start: "2026-11-19", end: "2026-11-22" },
    { id: "bel", label: "Belgium", start: "2026-11-22", end: "2026-11-24" },
    { id: "ams", label: "Amsterdam", start: "2026-11-24", end: "2026-11-28" },
    { id: "ham", label: "Hamburg", start: "2026-11-27", end: "2026-11-30" },
    { id: "cph", label: "Copenhagen", start: "2026-11-30", end: "2026-12-04" },
  ];
  return rows.map((r, i) => ({
    teamId,
    label: r.label,
    start: new Date(r.start),
    end: new Date(r.end),
    order: i,
  }));
}

type DemoItem = { section: "STAY" | "TRANSPORT" | "ACTIVITIES"; title: string; url: string; cost: string };

export const DEMO_ITEMS_BY_TRIP_LABEL: Record<string, DemoItem[]> = {
  Barcelona: [
    { section: "STAY", title: "Casa Bonay, Eixample", url: "https://casabonay.com", cost: "€410" },
    { section: "TRANSPORT", title: "Flight MAD → BCN", url: "https://iberia.com", cost: "€92" },
    { section: "TRANSPORT", title: "Train BCN → Paris", url: "", cost: "" },
    { section: "ACTIVITIES", title: "Sagrada Família", url: "https://sagradafamilia.org", cost: "€26" },
    { section: "ACTIVITIES", title: "Gothic Quarter walk", url: "", cost: "" },
  ],
  Paris: [
    { section: "STAY", title: "Hôtel du Temps, 9e", url: "https://hotel-du-temps.fr", cost: "€520" },
    { section: "TRANSPORT", title: "Navigo pass, 3 days", url: "", cost: "€31" },
    { section: "TRANSPORT", title: "Thalys Paris → Brussels", url: "https://sncf-connect.com", cost: "€58" },
    { section: "ACTIVITIES", title: "Musée d'Orsay", url: "https://musee-orsay.fr", cost: "€16" },
    { section: "ACTIVITIES", title: "Dinner, Le Servan", url: "", cost: "" },
  ],
  Belgium: [
    { section: "STAY", title: "Hotel Amigo, Brussels", url: "", cost: "€300" },
    { section: "TRANSPORT", title: "Day train to Bruges", url: "", cost: "" },
    { section: "TRANSPORT", title: "IC Brussels → Amsterdam", url: "https://belgiantrain.be", cost: "€45" },
    { section: "ACTIVITIES", title: "Bruges canal tour", url: "", cost: "€14" },
    { section: "ACTIVITIES", title: "Beer tasting, Delirium", url: "https://deliriumvillage.com", cost: "€22" },
  ],
  Amsterdam: [
    { section: "STAY", title: "Volkshotel, Oost", url: "", cost: "€560" },
    { section: "TRANSPORT", title: "Airport transfer", url: "https://schiphol.nl", cost: "€18" },
    { section: "TRANSPORT", title: "ICE Amsterdam → Hamburg", url: "", cost: "" },
    { section: "ACTIVITIES", title: "Van Gogh Museum", url: "https://vangoghmuseum.nl", cost: "€24" },
    { section: "ACTIVITIES", title: "Canal bike loop", url: "", cost: "" },
  ],
  Hamburg: [
    { section: "STAY", title: "25hours HafenCity", url: "https://25hours-hotels.com", cost: "€390" },
    { section: "TRANSPORT", title: "Ferry, Elbe harbour", url: "", cost: "€4" },
    { section: "TRANSPORT", title: "Train Hamburg → Copenhagen", url: "https://bahn.de", cost: "€79" },
    { section: "ACTIVITIES", title: "Elbphilharmonie plaza", url: "https://elbphilharmonie.de", cost: "€0" },
    { section: "ACTIVITIES", title: "Speicherstadt at night", url: "", cost: "" },
  ],
  Copenhagen: [
    { section: "STAY", title: "Hotel Sanders", url: "", cost: "€680" },
    { section: "TRANSPORT", title: "Bike rental, 4 days", url: "", cost: "" },
    { section: "TRANSPORT", title: "Flight CPH → MAD", url: "https://sas.se", cost: "€134" },
    { section: "ACTIVITIES", title: "Louisiana Museum", url: "https://louisiana.dk", cost: "€19" },
    { section: "ACTIVITIES", title: "Christmas market, Tivoli", url: "https://tivoli.dk", cost: "€21" },
  ],
};

/** Static holiday/note markers shown on the calendar. Not user editable, so
 * they live in code rather than the database. */
export const HOLIDAY_NOTES = [
  { id: "note-1", label: "All Saints' Day", start: "2026-11-01", end: "2026-11-01" },
  { id: "note-2", label: "Day of the Dead", start: "2026-11-02", end: "2026-11-02" },
  { id: "note-3", label: "Rail pass activates", start: "2026-11-16", end: "2026-11-16" },
];

export function demoTasks(teamId: string): Prisma.TaskCreateManyInput[] {
  const rows = [
    { title: "Book BCN → Paris train", tag: "19 Nov", done: false },
    { title: "Confirm Amsterdam apartment", tag: "24 Nov", done: false },
    { title: "Renew travel insurance", tag: "before 16 Nov", done: false },
    { title: "Belgium: reserve Bruges tour", tag: "23 Nov", done: false },
    { title: "Download offline maps", tag: "anytime", done: true },
  ];
  return rows.map((r, i) => ({ teamId, ...r, order: i }));
}
