/**
 *  CREATE TABLE IF NOT EXISTS chat_type (
                value TEXT PRIMARY KEY,
                description TEXT NOT NULL
            );

            INSERT OR IGNORE INTO chat_type (value, description)
            VALUES
                ('DM', 'Direct message between two users.'),
                ('GROUP', 'Group chat with multiple members.'),
                ('CHANNEL', 'Broadcast channel.'),
                ('FORUM', 'Discussion forum.');

            CREATE TABLE IF NOT EXISTS user (
                uuid TEXT PRIMARY KEY,
                email TEXT,
                name TEXT NOT NULL,
                surname TEXT NOT NULL,
                profilePictureUUID TEXT
            );

            -- Insert system user for system messages
            INSERT OR IGNORE INTO user (uuid, name, surname)
            VALUES ('00000000-0000-0000-0000-000000000000', 'System', '');

            CREATE TABLE IF NOT EXISTS handle_type (
                value TEXT PRIMARY KEY,
                description TEXT NOT NULL
            );

            INSERT OR IGNORE INTO
                handle_type (value, description)
            VALUES (
                    'USER',
                    'The handle refers to a user.'
                ),
                (
                    'CHAT',
                    'The handle refers to a chat.'
                ),
                (
                    'BOT',
                    'The handle refers to a bot.'
                );

            CREATE TABLE IF NOT EXISTS chat (
                uuid TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                name TEXT,
                description TEXT,
                profilePictureUUID TEXT,
                FOREIGN KEY (type) REFERENCES chat_type(value)
            );

            CREATE TABLE IF NOT EXISTS member (
                userUUID TEXT NOT NULL,
                chatUUID TEXT NOT NULL,
                PRIMARY KEY (userUUID, chatUUID),
                FOREIGN KEY (userUUID) REFERENCES user(uuid),
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid)
            );

            CREATE TABLE IF NOT EXISTS file (
                uuid TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                ref TEXT,
                mimeType TEXT NOT NULL,
                size INTEGER NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                duration INTEGER DEFAULT 0,
                waveform TEXT
            );

            CREATE TABLE IF NOT EXISTS message (
                id INTEGER NOT NULL,
                chatUUID TEXT NOT NULL,
                senderUUID TEXT NOT NULL,
                content TEXT,
                type TEXT NOT NULL DEFAULT 'message',
                system_action TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                is_pinned BOOLEAN NOT NULL DEFAULT 0,
                PRIMARY KEY (chatUUID, id),
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
                FOREIGN KEY (senderUUID) REFERENCES user(uuid)
            );

            CREATE TABLE IF NOT EXISTS message_files (
                chatUUID TEXT NOT NULL,
                messageID INTEGER NOT NULL,
                fileUUID TEXT NOT NULL,
                PRIMARY KEY (chatUUID, messageID, fileUUID),
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
                FOREIGN KEY (messageID) REFERENCES message(id),
                FOREIGN KEY (fileUUID) REFERENCES file(uuid)
            );

            CREATE TABLE IF NOT EXISTS pending_message (
                id TEXT NOT NULL,
                jobType TEXT NOT NULL,
                chatUUID TEXT,
                senderUUID TEXT,
                content TEXT,
                type TEXT,
                PRIMARY KEY (id),
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
                FOREIGN KEY (senderUUID) REFERENCES user(uuid)
            );

            CREATE TABLE IF NOT EXISTS pending_file (
                "index" INTEGER NOT NULL,
                pendingMessageID TEXT NOT NULL,
                uri TEXT,
                ref TEXT,
                mimeType TEXT NOT NULL,
                uuid TEXT,
                s3Url TEXT,
                PRIMARY KEY ("index", pendingMessageID),
                FOREIGN KEY (pendingMessageID) REFERENCES pending_message(id)
            );

            CREATE TABLE IF NOT EXISTS bot (
                uuid TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                profilePictureUUID TEXT,
                FOREIGN KEY (profilePictureUUID) REFERENCES file(uuid)
            );

            
            CREATE TABLE IF NOT EXISTS handle (
                userUUID TEXT NULL,
                chatUUID TEXT NULL,
                botUUID TEXT NULL,
                type TEXT NOT NULL,
                handle TEXT NOT NULL,
                CONSTRAINT handle_pkey PRIMARY KEY (handle),
                CONSTRAINT handle_handle_key UNIQUE (handle),
                FOREIGN KEY (userUUID) REFERENCES user(uuid),
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
                FOREIGN KEY (botUUID) REFERENCES bot(uuid),
                FOREIGN KEY (type) REFERENCES handle_type(value)
            );

            CREATE TABLE IF NOT EXISTS pinned_chat (
                userUUID TEXT NOT NULL,
                chatUUID TEXT NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (userUUID, chatUUID),
                FOREIGN KEY (userUUID) REFERENCES user(uuid),
                FOREIGN KEY (chatUUID) REFERENCES chat(uuid)
            );

            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_message_chatUUID ON message(chatUUID);
            CREATE INDEX IF NOT EXISTS idx_message_senderUUID ON message(senderUUID);
            CREATE INDEX IF NOT EXISTS idx_member_chatUUID ON member(chatUUID);
 */

export interface ChatType {
  value: string;
  description: string;
}

export interface HandleType {
  value: string;
  description: string;
}

export interface User {
  uuid: string;
  email?: string;
  name: string;
  surname: string;
  profilePictureUUID?: string;
}

export interface Message {
  id: number;
  chatUUID: string;
  senderUUID: string;
  content?: string;
  type?: string;
  system_action?: string;
  created_at: string;
}

export interface Chat {
  uuid: string;
  type: string;
  name?: string;
  members: string[];
  messages: Message[];
  description?: string;
  profilePictureUUID?: string;
}

export interface Handle {
  uuid: string;
  value: string;
  type: string;
}

export interface File {
  uuid: string;
  name: string;
  ref?: string;
  mimeType: string;
  size: number;
  created_at: string;
  duration?: number;
  waveform?: string;
}

export interface MessageFile {
  chatUUID: string;
  messageID: number;
  fileUUID: string;
}

export interface PendingMessage {
  id: string;
  jobType: string;
  chatUUID?: string;
  senderUUID?: string;
  content?: string;
  type?: string;
}

export interface PendingFile {
  index: number;
  pendingMessageID: string;
  uri?: string;
  ref?: string;
  mimeType: string;
  uuid?: string;
  s3Url?: string;
}

export interface Bot {
  uuid: string;
  name: string;
  description?: string;
  profilePictureUUID?: string;
}

export interface PinnedChat {
  userUUID: string;
  chatUUID: string;
  sort_order: number;
}
