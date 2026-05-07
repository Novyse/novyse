export interface User {
  uuid: string;
  email: string | null;
  name: string;
  surname: string;
  handle: string;
  profilePictureUUID: string | null;
  biography: string | null;
  birthday: string | null;
  region: string | null;
  country: string | null;
  status: "ONLINE" | "OFFLINE";
  lastAccessAt: Date | null;
}
