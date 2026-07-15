import { Member } from "./member";
import {
  Message,
  PinnedMessage,
  EditedMessage,
  DeletedMessage,
} from "./message";

export interface Sub {
  id: number;
  name: string;
  created_at: string;
}

interface ChatSettings {
  file: {
    singleFileSize: number;
    totalFileSize: number;
    maxFiles: number;
  };
}

interface BaseChat {
  uuid: string;
  subs: Sub[];
  messages: Message[];
  unreadCount: number;
  pinnedMessages: PinnedMessage[];
  editedMessages: EditedMessage[];
  deletedMessages: DeletedMessage[];
  settings: ChatSettings;
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
  members: Member[]; // 1 or 2 members (depends on if it's a self-chat)
}

export type Chat = PublicGroup | PrivateGroup | DMChat;
