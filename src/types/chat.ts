import { Member } from "./member";
import {
  Message,
  PinnedMessage,
  EditedMessage,
  DeletedMessage,
} from "./message";

interface BaseChat {
  uuid: string;
  messages: Message[];
  unreadCount: number;
  pinnedMessages: PinnedMessage[];
  editedMessages: EditedMessage[];
  deletedMessages: DeletedMessage[];
}

export interface PrivateGroup extends BaseChat {
  type: "GROUP" | "CHANNEL" | "FORUM";
  name: string;
  profilePictureUUID: string;
  members: Member[];
}

export interface PublicGroup extends PrivateGroup {
  handle: string;
}

export interface DMChat extends BaseChat {
  type: "DM";
  name: never;
  profilePictureUUID: never;
  members: [Member] | [Member, Member]; // 1 or 2 members (depends on if it's a self-chat)
}

export type Chat = PublicGroup | PrivateGroup | DMChat;
