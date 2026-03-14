export default `
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
    email TEXT,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    profilePictureUUID TEXT,
    description TEXT,
    birthday DATE,
    region TEXT,
    country TEXT
);


-- Insert system user for system messages
INSERT OR IGNORE INTO user (uuid, name, surname, description)
VALUES ('00000000-0000-0000-0000-000000000000', 'System', '', 'System user');

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

CREATE TABLE IF NOT EXISTS chat_pin (
    chatUUID TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid)
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
    replyTo_chatUUID TEXT,
    replyTo_messageID INTEGER,
    replyTo_rangeStart INTEGER,
    replyTo_rangeEnd INTEGER,
    PRIMARY KEY (chatUUID, id),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
    FOREIGN KEY (senderUUID) REFERENCES user(uuid)
);

CREATE TABLE IF NOT EXISTS pinned_message (
    chatUUID TEXT NOT NULL,
    messageID INTEGER NOT NULL,
    pinned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pinned_by TEXT NOT NULL,
    PRIMARY KEY (chatUUID, messageID),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
    FOREIGN KEY (messageID) REFERENCES message(id)
);

CREATE TABLE IF NOT EXISTS edited_message (
    chatUUID TEXT NOT NULL,
    messageID INTEGER NOT NULL,
    PRIMARY KEY (chatUUID, messageID),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
    FOREIGN KEY (messageID) REFERENCES message(id)
);

CREATE TABLE IF NOT EXISTS deleted_message (
    chatUUID TEXT NOT NULL,
    messageID INTEGER NOT NULL,
    PRIMARY KEY (chatUUID, messageID),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
    FOREIGN KEY (messageID) REFERENCES message(id)
);

CREATE TABLE IF NOT EXISTS reaction_message (
    chatUUID TEXT NOT NULL,
    messageID INTEGER NOT NULL,
    userUUID TEXT NOT NULL,
    reaction TEXT NOT NULL,
    at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chatUUID, messageID, userUUID, reaction),
    FOREIGN KEY (chatUUID) REFERENCES chat(uuid),
    FOREIGN KEY (messageID) REFERENCES message(id),
    FOREIGN KEY (userUUID) REFERENCES user(uuid)
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

CREATE TABLE IF NOT EXISTS message_reply (
    chatUUID TEXT NOT NULL,
    messageID INTEGER NOT NULL,
    replyTo_chatUUID TEXT NOT NULL,
    replyTo_messageID INTEGER NOT NULL,
    replyTo_rangeStart INTEGER,
    replyTo_rangeEnd INTEGER,
    PRIMARY KEY (chatUUID, messageID, replyTo_chatUUID, replyTo_messageID),
    FOREIGN KEY (chatUUID, messageID) REFERENCES message(chatUUID, id)
);

CREATE INDEX IF NOT EXISTS idx_message_reply_chat_msg ON message_reply(chatUUID, messageID);

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
`;
