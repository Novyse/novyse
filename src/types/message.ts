import { File } from "./file";

export interface Reaction {
  emoji: string;
  userUUIDs: string[];
  at: string | Date;
}

export interface Message {
  id: number;
  chatUUID: string;
  senderUUID: string;
  content: string;
  timestamp: Date;
  files: File[];
  reactions?: Reaction[];
}

export interface PinnedMessage {
  chatUUID: string;
  messageID: number;
  pinnedAt: Date;
  pinnedByUUID: string;
}

export interface EditedMessage {
  chatUUID: string;
  messageID: number;
  editedAt: Date;
  editedByUUID: string;
}

export interface DeletedMessage {
  chatUUID: string;
  messageID: number;
  deletedAt: Date;
  deletedByUUID: string;
}
