import 'package:sqflite/sqflite.dart';

const String initSql = '''
CREATE TABLE IF NOT EXISTS chat_type (
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
    name TEXT NOT NULL,
    surname TEXT,
    profilePictureUUID TEXT,
    bannerPictureUUID TEXT,
    biography TEXT,
    birthday DATE,
    region TEXT,
    country TEXT,
    color TEXT,
    profileEventID INTEGER DEFAULT 0
);

INSERT OR IGNORE INTO user (uuid, name, surname, biography)
VALUES ('00000000-0000-0000-0000-000000000000', 'System', '', 'System user');

CREATE TABLE IF NOT EXISTS handle_type (
    value TEXT PRIMARY KEY,
    description TEXT NOT NULL
);

INSERT OR IGNORE INTO handle_type (value, description)
VALUES
    ('USER', 'The handle refers to a user.'),
    ('CHAT', 'The handle refers to a chat.'),
    ('BOT', 'The handle refers to a bot.');

CREATE TABLE IF NOT EXISTS chat (
    uuid TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT,
    description TEXT,
    profilePictureUUID TEXT,
    eventID INTEGER DEFAULT 0,
    FOREIGN KEY (type) REFERENCES chat_type(value)
);

CREATE TABLE IF NOT EXISTS chat_sub (
    id INTEGER NOT NULL,
    chatUUID TEXT NOT NULL,
    name TEXT,
    type TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chatUUID, id),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_pin (
    chatUUID TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid)
);

CREATE TABLE IF NOT EXISTS role (
    id INTEGER NOT NULL,
    chatUUID TEXT NOT NULL,
    name TEXT NOT NULL,
    permission TEXT NOT NULL,
    level INTEGER NOT NULL,
    color TEXT,
    PRIMARY KEY (chatUUID, id),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member (
    userUUID TEXT NOT NULL,
    chatUUID TEXT NOT NULL,
    role_ids TEXT NOT NULL DEFAULT '[]',
    joined_at TIMESTAMP NOT NULL,
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
    subID INTEGER NOT NULL,
    senderUUID TEXT NOT NULL,
    content TEXT,
    type TEXT NOT NULL DEFAULT 'message',
    system_action TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    replyTo_chatUUID TEXT,
    replyTo_subID INTEGER,
    replyTo_messageID INTEGER,
    replyTo_rangeStart INTEGER,
    replyTo_rangeEnd INTEGER,
    PRIMARY KEY (chatUUID, subID, id),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
    FOREIGN KEY (senderUUID) REFERENCES user(uuid)
);

CREATE TABLE IF NOT EXISTS pinned_message (
    chatUUID TEXT NOT NULL,
    subID INTEGER NOT NULL,
    messageID INTEGER NOT NULL,
    pinned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pinned_by TEXT NOT NULL,
    PRIMARY KEY (chatUUID, subID, messageID),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
    FOREIGN KEY (chatUUID, subID, messageID) REFERENCES message(chatUUID, subID, id)
);

CREATE TABLE IF NOT EXISTS edited_message (
    chatUUID TEXT NOT NULL,
    subID INTEGER NOT NULL,
    messageID INTEGER NOT NULL,
    PRIMARY KEY (chatUUID, subID, messageID),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
    FOREIGN KEY (chatUUID, subID, messageID) REFERENCES message(chatUUID, subID, id)
);

CREATE TABLE IF NOT EXISTS deleted_message (
    chatUUID TEXT NOT NULL,
    subID INTEGER NOT NULL,
    messageID INTEGER NOT NULL,
    PRIMARY KEY (chatUUID, subID, messageID),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
    FOREIGN KEY (chatUUID, subID, messageID) REFERENCES message(chatUUID, subID, id)
);

CREATE TABLE IF NOT EXISTS reaction_message (
    chatUUID TEXT NOT NULL,
    subID INTEGER NOT NULL,
    messageID INTEGER NOT NULL,
    userUUID TEXT NOT NULL,
    reaction TEXT NOT NULL,
    at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chatUUID, subID, messageID, userUUID, reaction),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
    FOREIGN KEY (chatUUID, subID, messageID) REFERENCES message(chatUUID, subID, id),
    FOREIGN KEY (userUUID) REFERENCES user(uuid)
);

CREATE TABLE IF NOT EXISTS message_files (
    chatUUID TEXT NOT NULL,
    subID INTEGER NOT NULL,
    messageID INTEGER NOT NULL,
    fileUUID TEXT NOT NULL,
    PRIMARY KEY (chatUUID, subID, messageID, fileUUID),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
    FOREIGN KEY (chatUUID, subID, messageID) REFERENCES message(chatUUID, subID, id),
    FOREIGN KEY (fileUUID) REFERENCES file(uuid)
);

CREATE TABLE IF NOT EXISTS message_reply (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chatUUID TEXT NOT NULL,
    subID INTEGER NOT NULL,
    messageID INTEGER NOT NULL,
    replyTo_chatUUID TEXT NOT NULL,
    replyTo_subID INTEGER NOT NULL,
    replyTo_messageID INTEGER NOT NULL,
    replyTo_rangeStart INTEGER,
    replyTo_rangeEnd INTEGER,
    FOREIGN KEY (chatUUID, subID, messageID) REFERENCES message(chatUUID, subID, id)
);

CREATE INDEX IF NOT EXISTS idx_message_reply_chat_msg ON message_reply(chatUUID, subID, messageID);

CREATE TABLE IF NOT EXISTS message_read (
    chat_uuid TEXT NOT NULL,
    sub_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    user_uuid TEXT NOT NULL,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_message_read PRIMARY KEY (chat_uuid, sub_id, message_id, user_uuid),
    CONSTRAINT fk_message_read_message FOREIGN KEY (chat_uuid, sub_id, message_id) REFERENCES message (chatUUID, subID, id) ON DELETE CASCADE,
    FOREIGN KEY (user_uuid) REFERENCES user (uuid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_message_read_user_chat ON message_read (chat_uuid, user_uuid, message_id DESC);

CREATE TABLE IF NOT EXISTS pending_message (
    id TEXT NOT NULL,
    jobType TEXT NOT NULL,
    chatUUID TEXT,
    senderUUID TEXT,
    content TEXT,
    type TEXT,
    replyTo_chatUUID TEXT,
    replyTo_messageID INTEGER,
    replyTo_rangeStart INTEGER,
    replyTo_rangeEnd INTEGER,
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
    biography TEXT,
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

CREATE TABLE IF NOT EXISTS queue_job (
    id TEXT PRIMARY KEY,
    chat_uuid TEXT NOT NULL,
    sub_id INTEGER DEFAULT 0,
    job_type TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'PENDING',
    payload TEXT NOT NULL,
    progress REAL DEFAULT 0.0,
    attempts INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_uuid) REFERENCES chat(uuid)
);

CREATE INDEX IF NOT EXISTS idx_message_chatUUID ON message(chatUUID);
CREATE INDEX IF NOT EXISTS idx_message_senderUUID ON message(senderUUID);
CREATE INDEX IF NOT EXISTS idx_member_chatUUID ON member(chatUUID);
CREATE INDEX IF NOT EXISTS idx_queue_job_chat_status ON queue_job (chat_uuid, status, priority DESC, created_at ASC);
''';

/// Executes the full initialization SQL script on [db].
Future<void> executeInitSql(DatabaseExecutor db) async {
  final batch = db.batch();
  final statements = initSql
      .split(';')
      .map((s) => s.trim())
      .where((s) => s.isNotEmpty)
      .toList();

  for (final statement in statements) {
    batch.execute(statement);
  }
  await batch.commit(noResult: true);
}
