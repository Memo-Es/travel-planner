export type AttachmentData = {
  id: string;
  name: string;
  size: number;
};

export type ItemData = {
  id: string;
  t: string;
  url: string;
  /** Google Maps link or address, "" if not set. */
  location: string;
  /** Total paid for the booking. */
  costAmount: number | null;
  /** Who paid it, if known. */
  paidById: string | null;
  /** Who splits the cost; empty means the whole team. */
  shareIds: string[];
  /** Day the plan happens, "YYYY-MM-DD", if it has one. */
  date: string | null;
  /** Local start time, "HH:mm", if it has one. */
  time: string | null;
  attachments: AttachmentData[];
};

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
