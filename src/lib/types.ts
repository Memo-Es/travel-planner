export type ItemData = {
  id: string;
  t: string;
  url: string;
  costAmount: number | null;
};

export type TripData = {
  id: string;
  label: string;
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
