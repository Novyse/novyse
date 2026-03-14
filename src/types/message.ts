import { File } from "./file";

export interface Reaction {
  emoji: string;
  userUUIDs: string[];
  at: string | Date;
}

export interface ReplyTo {
  chatUUID: string;
  messageID: number;
  rangeStart: number;
  rangeEnd: number;
}

export interface RepliedFrom {
  chatUUID: string;
  messageID: number;
}

export interface Message {
  id: number;
  senderUUID: string;
  content: string;
  timestamp: Date;
  files: File[];
  reactions?: Reaction[];
  replyTos?: ReplyTo[];
  repliedFroms?: RepliedFrom[];
}

export interface PinnedMessage {
  messageID: number;
  pinnedAt: Date;
  pinnedByUUID: string;
}

export interface EditedMessage {
  messageID: number;
  editedAt: Date;
  editedByUUID: string;
}

export interface DeletedMessage {
  messageID: number;
  deletedAt: Date;
  deletedByUUID: string;
}
