import { File } from "./file";

export interface Reaction {
  emoji: string;
  userUUIDs: string[];
  at: string | Date;
}

export interface Message {
  id: number;
  senderUUID: string;
  content: string;
  timestamp: Date;
  files: File[];
  reactions?: Reaction[];
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
