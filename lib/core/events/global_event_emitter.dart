import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/storage/database/database.dart';

/// Business-logic event emitter — equivalent of JS `GlobalEventEmitter`.
///
/// Handles database writes first, then broadcasts an event on the [EventBus]
/// so the UI / other services can react.
class GlobalEventEmitter {
  static final GlobalEventEmitter instance = GlobalEventEmitter(
    EventBus.instance,
    AppDatabase.instance,
  );

  final EventBus _bus;
  final AppDatabase _db;
  final Map<String, List<void Function(dynamic)>> _namedListeners = {};

  late final MessageEmitter message;
  late final UserEmitter user;
  late final ChatEmitter chat;

  GlobalEventEmitter(this._bus, [AppDatabase? db])
    : _db = db ?? AppDatabase.instance {
    message = MessageEmitter(_bus, _db, this);
    user = UserEmitter(_bus, _db);
    chat = ChatEmitter(_bus, _db);
  }

  /// Registers a callback for named events (e.g. 'message:sent', 'message:new').
  void on(String eventName, void Function(dynamic) listener) {
    _namedListeners.putIfAbsent(eventName, () => []).add(listener);
  }

  /// Unregisters a callback for a named event.
  void off(String eventName, void Function(dynamic) listener) {
    _namedListeners[eventName]?.remove(listener);
  }

  /// Emits a named event to registered callbacks.
  void emit(String eventName, [dynamic data]) {
    final listeners = _namedListeners[eventName];
    if (listeners != null) {
      for (final listener in List.of(listeners)) {
        try {
          listener(data);
        } catch (_) {}
      }
    }
  }

  EventBus get bus => _bus;

  //  file

  Future<void> fileReady(String fileUUID, [String? uri]) async {
    if (uri != null) {
      await _db.updateFileURI(fileUUID, uri);
    }
    _bus.emit(FileReadyEvent(fileUUID));
  }
}

//  Message sub-emitter

class MessageEmitter {
  final EventBus _bus;
  final AppDatabase _db;
  final GlobalEventEmitter _emitter;
  MessageEmitter(this._bus, this._db, this._emitter);

  Future<void> add(Map<String, dynamic> message) async {
    final tempId = message['tempId']?.toString();
    final newId = message['id']?.toString() ?? '';
    final chatUUID = (message['chatUUID'] ?? '').toString();
    final subID = message['subID'] is num
        ? (message['subID'] as num).toInt()
        : (int.tryParse(message['subID']?.toString() ?? '0') ?? 0);

    // If this confirmed message replaces an optimistic message with a different tempId, cleanup SQLite
    if (tempId != null && tempId.isNotEmpty && tempId != newId) {
      await _db.message.delete(chatUUID, subID, tempId);
    }

    await _db.message.add(message);
    _bus.emit(MessageNewEvent(message));
    _emitter.emit('message:new', message);
  }

  Future<void> failed(String tempId, String? error) async {
    _bus.emit(MessageFailedEvent(tempId: tempId, error: error));
    _emitter.emit('message:failed', {'tempId': tempId, 'error': error});
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
        final content = data['content'] as String? ?? '';
        await _db.message.edit(chatUUID, subID, messageID, content);
        break;
      case 'delete':
        await _db.message.delete(chatUUID, subID, messageID);
        break;
      case 'pin_add':
        await _db.message.pin.add(
          chatUUID,
          subID,
          messageID,
          data['pinnedAt'] as String?,
          data['userUUID'] as String? ?? data['pinnedBy'] as String?,
        );
        break;
      case 'pin_remove':
        await _db.message.pin.remove(chatUUID, subID, messageID);
        break;
      case 'reaction_add':
        final emoji = (data['reaction'] ?? data['emoji']) as String? ?? '';
        final at =
            (data['reactedAt'] ??
                    data['at'] ??
                    DateTime.now().toIso8601String())
                as String;
        final userUUID =
            (data['userUUID'] ?? data['user_uuid']) as String? ?? '';
        await _db.message.reaction.add(
          chatUUID,
          subID,
          messageID,
          emoji,
          at,
          userUUID,
        );
        break;
      case 'reaction_remove':
        final emoji = (data['reaction'] ?? data['emoji']) as String? ?? '';
        final userUUID =
            (data['userUUID'] ?? data['user_uuid']) as String? ?? '';
        await _db.message.reaction.remove(
          chatUUID,
          subID,
          messageID,
          emoji,
          userUUID,
        );
        break;
      case 'read':
        final userUUID =
            (data['userUUID'] ?? data['user_uuid']) as String? ?? '';
        final readAt =
            (data['readAt'] ??
                    data['read_at'] ??
                    DateTime.now().toIso8601String())
                as String;
        await _db.message.read.add(
          chatUUID,
          subID,
          messageID,
          userUUID,
          readAt,
        );
        break;
    }

    if (eventID != null) {
      await _db.event.chat.update(chatUUID, eventID);
    }

    _bus.emit(
      MessageUpdateEvent(
        chatUUID: chatUUID,
        subID: subID,
        messageID: messageID,
        action: action,
        data: data,
      ),
    );
  }
}

//  User sub-emitter

class UserEmitter {
  final EventBus _bus;
  final AppDatabase _db;
  late final UserProfileEmitter profile;
  late final UserPresenceEmitter presence;
  late final UserSettingEmitter setting;

  UserEmitter(this._bus, this._db) {
    profile = UserProfileEmitter(_bus, _db);
    presence = UserPresenceEmitter(_bus);
    setting = UserSettingEmitter(_bus, _db);
  }
}

class UserProfileEmitter {
  final EventBus _bus;
  final AppDatabase _db;
  UserProfileEmitter(this._bus, this._db);

  Future<void> update(Map<String, dynamic> data, int? eventID) async {
    final userUUID = data['userUUID'] as String?;
    if (userUUID == null || userUUID.isEmpty) return;

    final name = data['name'] as String?;
    final surname = data['surname'] as String?;
    final biography = data['biography'] as String?;
    final profilePictureUUID =
        (data['profilePictureUUID'] ?? data['profilePictureUuid']) as String?;
    final bannerPictureUUID =
        (data['bannerPictureUUID'] ?? data['bannerPictureUuid']) as String?;
    final birthday = data['birthday'];
    final region = data['region'] as String?;
    final country = data['country'] as String?;
    final color = data['color'];
    final handle = data['handle'] as String?;

    if (name != null) {
      await _db.user.profile.name.update(userUUID, name);
    }
    if (surname != null) {
      await _db.user.profile.surname.update(userUUID, surname);
    }
    if (biography != null) {
      await _db.user.profile.biography.update(userUUID, biography);
    }
    if (profilePictureUUID != null) {
      await _db.user.profile.picture.update(userUUID, profilePictureUUID);
    }
    if (birthday != null) {
      await _db.user.profile.birthday.update(userUUID, birthday);
    }
    if (region != null) {
      await _db.user.profile.region.update(userUUID, region);
    }
    if (country != null) {
      await _db.user.profile.country.update(userUUID, country);
    }
    if (bannerPictureUUID != null) {
      await _db.user.profile.banner.update(userUUID, bannerPictureUUID);
    }
    if (color != null) {
      await _db.user.profile.color.update(userUUID, color);
    }
    if (handle != null) {
      await _db.handle.update.user(userUUID, handle);
    }

    if (eventID != null) {
      await _db.event.user.profile.update(userUUID, eventID);
    }

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
    _bus.emit(
      UserPresenceUpdateEvent(
        userUUID: userUUID,
        status: status,
        lastAccessAt: lastAccessAt,
      ),
    );
  }
}

class UserSettingEmitter {
  final EventBus _bus;
  final AppDatabase _db;
  late final UserSettingChatEmitter chat;

  UserSettingEmitter(this._bus, this._db) {
    chat = UserSettingChatEmitter(_bus, _db);
  }
}

class UserSettingChatEmitter {
  final EventBus _bus;
  final AppDatabase _db;
  UserSettingChatEmitter(this._bus, this._db);

  Future<void> update(
    String chatUUID,
    String action,
    int? eventID,
    Map<String, dynamic> data,
  ) async {
    switch (action) {
      case 'pin_add':
        final position = (data['position'] as num?)?.toInt() ?? 0;
        await _db.chat.pin.add(chatUUID, position);
        break;
      case 'pin_remove':
        await _db.chat.pin.remove(chatUUID);
        break;
    }

    _bus.emit(
      UserSettingChatUpdateEvent(
        chatUUID: chatUUID,
        action: action,
        data: data,
      ),
    );
  }
}

//  Chat sub-emitter

class ChatEmitter {
  final EventBus _bus;
  final AppDatabase _db;
  late final ChatMemberEmitter member;

  ChatEmitter(this._bus, this._db) {
    member = ChatMemberEmitter(_bus, _db);
  }

  Future<void> add(Map<String, dynamic> chat, List<dynamic> users) async {
    await _db.chat.add(chat);

    final messages = chat['messages'];
    if (messages is List && messages.isNotEmpty) {
      await _db.message.addMultiple(messages);
    }

    if (users.isNotEmpty) {
      await _db.user.addMultiple(users);
    }

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
        final subData = data['sub'] is Map
            ? Map<String, dynamic>.from(data['sub'] as Map)
            : data;
        await _db.chat.sub.add(chatUUID, subData);
        break;
      case 'sub_rename':
        final subData = data['sub'] is Map
            ? Map<String, dynamic>.from(data['sub'] as Map)
            : data;
        final subId =
            (subData['id'] is num
                ? (subData['id'] as num).toInt()
                : int.tryParse(subData['id']?.toString() ?? '0')) ??
            0;
        await _db.chat.sub.update(chatUUID, subId, subData);
        break;
      case 'sub_delete':
        final rawSubId = data['subID'] ?? data['id'];
        final subId =
            (rawSubId is num
                ? rawSubId.toInt()
                : int.tryParse(rawSubId?.toString() ?? '0')) ??
            0;
        await _db.chat.sub.remove(chatUUID, subId);
        break;
    }

    if (eventID != null) {
      await _db.event.chat.update(chatUUID, eventID);
    }

    _bus.emit(ChatUpdateEvent(chatUUID: chatUUID, action: action, data: data));
  }
}

class ChatMemberEmitter {
  final EventBus _bus;
  final AppDatabase _db;
  ChatMemberEmitter(this._bus, this._db);

  Future<void> join(
    String chatUUID,
    Map<String, dynamic> user,
    int? eventID,
  ) async {
    await _db.chat.member.add(chatUUID, user);
    if (eventID != null) {
      await _db.event.chat.update(chatUUID, eventID);
    }
    await _db.user.add(user);
    _bus.emit(ChatMemberJoinedEvent(chatUUID: chatUUID, user: user));
  }

  Future<void> leave(String chatUUID, Map<String, dynamic> user) async {
    await _db.chat.member.remove(chatUUID, user);
    _bus.emit(ChatMemberLeftEvent(chatUUID: chatUUID, user: user));
  }

  Future<void> activity(String chatUUID, String userUUID, String action) async {
    _bus.emit(
      ChatMemberActivityEvent(
        chatUUID: chatUUID,
        userUUID: userUUID,
        action: action,
      ),
    );
  }
}

/// Global singleton instance of [GlobalEventEmitter].
final globalEventEmitter = GlobalEventEmitter.instance;

/// Riverpod provider for accessing the global [GlobalEventEmitter].
final globalEventEmitterProvider = Provider<GlobalEventEmitter>(
  (ref) => GlobalEventEmitter.instance,
);
