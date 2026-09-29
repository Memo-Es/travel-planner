export type ItemData = {
  id: string;
  t: string;
  url: string;
  address: string;
  /** Local reservation time at the destination, "YYYY-MM-DDTHH:mm". */
  startsAt: string | null;
  costAmount: number | null;
  /** User ids splitting this booking's cost equally. */
  shareIds: string[];
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

export type TaskData = {
  id: string;
  title: string;
  tag: string;
  done: boolean;
  assigneeId: string | null;
  assigneeName: string | null;
};

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
