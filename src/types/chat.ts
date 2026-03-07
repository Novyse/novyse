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
  name: string;
  profilePictureUUID: string;
  unreadCount: number;
  pinnedMessages: PinnedMessage[];
  editedMessages: EditedMessage[];
  deletedMessages: DeletedMessage[];
}

export interface GroupChat extends BaseChat {
  type: "GROUP" | "CHANNEL" | "FORUM";
  members: Member[];
}

export interface DMChat extends BaseChat {
  type: "DM";
  members: [Member] | [Member, Member]; // 1 or 2 members (depends on if it's a self-chat)
}

export type Chat = GroupChat | DMChat;
