export type AttachmentData = {
  id: string;
  name: string;
  size: number;
};

export type ItemData = {
  id: string;
  t: string;
  url: string;
  costAmount: number | null;
  /** Day the plan happens, "YYYY-MM-DD", if it has one. */
  date: string | null;
  /** Local start time, "HH:mm", if it has one. */
  time: string | null;
  attachments: AttachmentData[];
  /** Who signed up to go, in the order they joined. */
  going: Person[];
  /** A short free-text note, if one was added. */
  notes: string | null;
  /** Who fronted the money, for splitting costs - see lib/balances.ts. */
  paidBy: Person | null;
};

export type Person = { id: string; name: string };

export type TripData = {
  id: string;
  label: string;
  color: string | null;
  photoUrl: string | null;
  start: string;
  end: string;
  stay: ItemData[];
  transport: ItemData[];
  activities: ItemData[];
};

export type ItemSectionKey = "stay" | "transport" | "activities";

export type MemberOption = {
  id: string;
  name: string;
  role: "OWNER" | "MEMBER";
};

export type TeamOption = {
  id: string;
  name: string;
  active: boolean;
};

export type InviteData = {
  id: string;
  token: string;
  createdAt: string;
  createdByName: string;
  acceptedAt: string | null;
  acceptedEmail: string | null;
};
