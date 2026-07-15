import { File } from "./file";

export interface Reaction {
  emoji: string;
  userUUIDs: string[];
  at: string | Date;
}

export interface ReplyTo {
  chatUUID: string;
  subID: number;
  messageID: number;
  rangeStart: number;
  rangeEnd: number;
}

export interface RepliedFrom {
  chatUUID: string;
  subID: number;
  messageID: number;
}

export interface Message {
  id: number;
  subID: number;
  senderUUID: string;
  content: string;
  timestamp: Date;
  files: File[];
  reactions?: Reaction[];
  replyTos?: ReplyTo[];
  repliedFroms?: RepliedFrom[];
}

export interface PinnedMessage {
  subID: number;
  messageID: number;
  pinnedAt: Date;
  pinnedByUUID: string;
}

export interface EditedMessage {
  subID: number;
  messageID: number;
  editedAt: Date;
  editedByUUID: string;
}

export interface DeletedMessage {
  subID: number;
  messageID: number;
  deletedAt: Date;
  deletedByUUID: string;
}
