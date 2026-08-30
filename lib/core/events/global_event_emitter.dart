import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';

/// Business-logic event emitter — equivalent of JS `GlobalEventEmitter`.
///
/// Handles database writes first, then broadcasts an event on the [EventBus]
/// so the UI / other services can react.
///
/// Database calls are stubbed with TODO — fill them in once the Drift/SQLite
/// layer is migrated.
class GlobalEventEmitter {
  final EventBus _bus;
  late final MessageEmitter message;
  late final UserEmitter user;
  late final ChatEmitter chat;

  GlobalEventEmitter(this._bus) {
    message = MessageEmitter(_bus);
    user = UserEmitter(_bus);
    chat = ChatEmitter(_bus);
  }

  // ── file ──

  Future<void> fileReady(String fileUUID) async {
    // TODO: await database.updateFileURI(fileUUID, uri);
    _bus.emit(FileReadyEvent(fileUUID));
  }
}

// Message sub-emitter

class MessageEmitter {
  final EventBus _bus;
  MessageEmitter(this._bus);

  Future<void> add(Map<String, dynamic> message) async {
    // TODO: await database.message.add(message);
    _bus.emit(MessageNewEvent(message));
  }

  Future<void> update(
    String chatUUID,
    int subID,
    String messageID,
    String action,
    int? eventID,
    Map<String, dynamic> data,
  ) async {
    switch (action) {
      case 'edit':
        // TODO: await database.message.edit(chatUUID, subID, messageID, data['content']);
        break;
      case 'delete':
        // TODO: await database.message.delete(chatUUID, subID, messageID);
        break;
      case 'pin_add':
        // TODO: await database.message.pin.add(...);
        break;
      case 'pin_remove':
        // TODO: await database.message.pin.remove(chatUUID, subID, messageID);
        break;
      case 'reaction_add':
        // TODO: await database.message.reaction.add(...);
        break;
      case 'reaction_remove':
        // TODO: await database.message.reaction.remove(...);
        break;
      case 'read':
        // TODO: await database.message.read.add(...);
        break;
    }

    // TODO: if (eventID != null) await database.event.chat.update(chatUUID, eventID);

    _bus.emit(MessageUpdateEvent(
      chatUUID: chatUUID,
      subID: subID,
      messageID: messageID,
      action: action,
      data: data,
    ));
  }
}

// User sub-emitter

class UserEmitter {
  final EventBus _bus;
  late final UserProfileEmitter profile;
  late final UserPresenceEmitter presence;
  late final UserSettingEmitter setting;

  UserEmitter(this._bus) {
    profile = UserProfileEmitter(_bus);
    presence = UserPresenceEmitter(_bus);
    setting = UserSettingEmitter(_bus);
  }
}

class UserProfileEmitter {
  final EventBus _bus;
  UserProfileEmitter(this._bus);

  Future<void> update(Map<String, dynamic> data, int? eventID) async {
    final userUUID = data['userUUID'] as String?;
    if (userUUID == null) return;

    // TODO: database writes for each field (name, surname, biography, etc.)
    // TODO: if (eventID != null) await database.event.user.profile.update(userUUID, eventID);

    _bus.emit(UserProfileUpdateEvent(userUUID: userUUID, data: data));
  }
}

class UserPresenceEmitter {
  final EventBus _bus;
  UserPresenceEmitter(this._bus);

  Future<void> update(
    String userUUID,
    String status, [
    String? lastAccessAt,
  ]) async {
    _bus.emit(UserPresenceUpdateEvent(
      userUUID: userUUID,
      status: status,
      lastAccessAt: lastAccessAt,
    ));
  }
}

class UserSettingEmitter {
  final EventBus _bus;
  late final UserSettingChatEmitter chat;

  UserSettingEmitter(this._bus) {
    chat = UserSettingChatEmitter(_bus);
  }
}

class UserSettingChatEmitter {
  final EventBus _bus;
  UserSettingChatEmitter(this._bus);

  Future<void> update(
    String chatUUID,
    String action,
    int? eventID,
    Map<String, dynamic> data,
  ) async {
    switch (action) {
      case 'pin_add':
        // TODO: await database.chat.pin.add(chatUUID, data['position']);
        break;
      case 'pin_remove':
        // TODO: await database.chat.pin.remove(chatUUID);
        break;
    }

    // TODO: if (eventID != null) await AsyncStorage / shared_preferences

    _bus.emit(UserSettingChatUpdateEvent(
      chatUUID: chatUUID,
      action: action,
      data: data,
    ));
  }
}

// Chat sub-emitter

class ChatEmitter {
  final EventBus _bus;
  late final ChatMemberEmitter member;

  ChatEmitter(this._bus) {
    member = ChatMemberEmitter(_bus);
  }

  Future<void> add(Map<String, dynamic> chat, List<dynamic> users) async {
    // TODO: await database.chat.add(chat);
    // TODO: add messages from chat['messages']
    // TODO: for user in users → await database.user.add(user);
    _bus.emit(ChatNewEvent(chat: chat, users: users));
  }

  Future<void> update(
    String chatUUID,
    String action,
    int? eventID,
    Map<String, dynamic> data,
  ) async {
    switch (action) {
      case 'sub_create':
        // TODO: await database.chat.sub.add(chatUUID, data['sub'] ?? data);
        break;
      case 'sub_rename':
        // TODO: await database.chat.sub.update(...);
        break;
      case 'sub_delete':
        // TODO: await database.chat.sub.remove(chatUUID, data['subID'] ?? data['id']);
        break;
    }

    // TODO: if (eventID != null) await database.event.chat.update(chatUUID, eventID);

    _bus.emit(ChatUpdateEvent(
      chatUUID: chatUUID,
      action: action,
      data: data,
    ));
  }
}

class ChatMemberEmitter {
  final EventBus _bus;
  ChatMemberEmitter(this._bus);

  Future<void> join(
    String chatUUID,
    Map<String, dynamic> user,
    int? eventID,
  ) async {
    // TODO: await database.chat.member.add(chatUUID, user);
    // TODO: if (eventID != null) await database.event.chat.update(chatUUID, eventID);
    // TODO: await database.user.add(user);
    _bus.emit(ChatMemberJoinedEvent(chatUUID: chatUUID, user: user));
  }

  Future<void> leave(String chatUUID, Map<String, dynamic> user) async {
    // TODO: await database.chat.member.remove(chatUUID, user);
    _bus.emit(ChatMemberLeftEvent(chatUUID: chatUUID, user: user));
  }

  Future<void> activity(
    String chatUUID,
    String userUUID,
    String action,
  ) async {
    _bus.emit(ChatMemberActivityEvent(
      chatUUID: chatUUID,
      userUUID: userUUID,
      action: action,
    ));
  }
}

// Provider

final globalEventEmitterProvider = Provider<GlobalEventEmitter>((ref) {
  return GlobalEventEmitter(ref.watch(eventBusProvider));
});
