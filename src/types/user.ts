export interface User {
  uuid: string;
  email: string | null;
  name: string;
  surname: string;
  handle: string;
  profilePictureUUID: string | null;
  description: string | null;
  birthday: string | null;
  region: string | null;
  country: string | null;
  isOnline: boolean;
}
