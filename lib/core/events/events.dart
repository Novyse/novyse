library;

/// Strongly-typed event classes used across the application.
///
/// Each sealed/base class groups related events so consumers can listen
/// to a specific type via `eventBus.on<MessageNewEvent>()`.

// Global / App-level events

class InvalidSessionEvent {
  const InvalidSessionEvent();
}

class ClientUpdateRequiredEvent {
  final String? minVersion;
  const ClientUpdateRequiredEvent({this.minVersion});
}

class FileReadyEvent {
  final String fileUUID;
  const FileReadyEvent(this.fileUUID);
}

// Message events

class MessageNewEvent {
  final Map<String, dynamic> message;
  const MessageNewEvent(this.message);
}

class MessageFailedEvent {
  final String tempId;
  final String? error;
  const MessageFailedEvent({required this.tempId, this.error});
}

class MessageUpdateEvent {
  final String chatUUID;
  final int subID;
  final String messageID;
  final String action;
  final Map<String, dynamic> data;

  const MessageUpdateEvent({
    required this.chatUUID,
    required this.subID,
    required this.messageID,
    required this.action,
    required this.data,
  });
}

// User events

class UserProfileUpdateEvent {
  final String userUUID;
  final Map<String, dynamic> data;
  const UserProfileUpdateEvent({required this.userUUID, required this.data});
}

class UserPresenceUpdateEvent {
  final String userUUID;
  final String status; // 'ONLINE' | 'OFFLINE'
  final String? lastAccessAt;

  const UserPresenceUpdateEvent({
    required this.userUUID,
    required this.status,
    this.lastAccessAt,
  });
}

class UserSettingChatUpdateEvent {
  final String chatUUID;
  final String action;
  final Map<String, dynamic> data;

  const UserSettingChatUpdateEvent({
    required this.chatUUID,
    required this.action,
    required this.data,
  });
}

// Chat events

class ChatNewEvent {
  final Map<String, dynamic> chat;
  final List<dynamic> users;
  const ChatNewEvent({required this.chat, required this.users});
}

class ChatUpdateEvent {
  final String chatUUID;
  final String action;
  final Map<String, dynamic> data;

  const ChatUpdateEvent({
    required this.chatUUID,
    required this.action,
    required this.data,
  });
}

class ChatMemberJoinedEvent {
  final String chatUUID;
  final Map<String, dynamic> user;
  const ChatMemberJoinedEvent({required this.chatUUID, required this.user});
}

class ChatMemberLeftEvent {
  final String chatUUID;
  final Map<String, dynamic> user;
  const ChatMemberLeftEvent({required this.chatUUID, required this.user});
}

class ChatMemberActivityEvent {
  final String chatUUID;
  final String userUUID;
  final String action;

  const ChatMemberActivityEvent({
    required this.chatUUID,
    required this.userUUID,
    required this.action,
  });
}
