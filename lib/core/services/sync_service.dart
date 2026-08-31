import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/services/socket_service.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/network_store.dart';
import 'package:novyse/core/stores/status_store.dart';
import 'package:novyse/core/stores/user_store.dart';

/// Event type constants matching backend definitions.
abstract class SyncChatEventType {
  static const messageEdited = 'MESSAGE_EDITED';
  static const reactionAdded = 'REACTION_ADDED';
  static const reactionRemoved = 'REACTION_REMOVED';
  static const messageDeleted = 'MESSAGE_DELETED';
  static const messagePinned = 'MESSAGE_PINNED';
  static const messageUnpinned = 'MESSAGE_UNPINNED';
  static const subCreated = 'SUB_CREATED';
  static const subRenamed = 'SUB_RENAMED';
  static const subDeleted = 'SUB_DELETED';
  static const memberJoined = 'MEMBER_JOINED';
  static const memberLeft = 'MEMBER_LEFT';
  static const messageRead = 'MESSAGE_READ';
}

abstract class SyncUserProfileEventType {
  static const bioChanged = 'BIO_CHANGED';
  static const pictureChanged = 'PICTURE_CHANGED';
  static const bannerChanged = 'BANNER_CHANGED';
  static const nameChanged = 'NAME_CHANGED';
  static const surnameChanged = 'SURNAME_CHANGED';
  static const birthdayChanged = 'BIRTHDAY_CHANGED';
  static const colorChanged = 'COLOR_CHANGED';
  static const handleChanged = 'HANDLE_CHANGED';
}

abstract class SyncUserEventType {
  static const chatPinned = 'CHAT_PINNED';
  static const chatUnpinned = 'CHAT_UNPINNED';
}

/// Orchestrates full account initialization and delta synchronization.
class SyncService {
  final Ref _ref;
  final FlutterSecureStorage _storage;

  bool _isSyncing = false;
  Timer? _retryTimer;
  int _retryCountdown = 0;

  SyncService(this._ref, [FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  bool get isSyncing => _isSyncing;

  Gateway get _gateway => _ref.read(apiGatewayProvider);
  AppDatabase get _db => _ref.read(databaseProvider);
  StatusNotifier get _status => _ref.read(statusProvider.notifier);
  NetworkNotifier get _network => _ref.read(networkProvider.notifier);
  SocketService get _socket => _ref.read(socketServiceProvider);
  GlobalEventEmitter get _emitter => _ref.read(globalEventEmitterProvider);

  /// Checks whether initialization is needed and runs either full init or delta sync.
  Future<bool> ensureInitialized() async {
    if (_isSyncing) {
      debugPrint('[SyncService] Sync already in progress, skipping...');
      return false;
    }

    try {
      if (!_db.isOpen) {
        await _db.initialize();
      }

      final initVal = await _storage.read(key: 'init');
      if (initVal == 'true') {
        debugPrint('[SyncService] Already initialized. Performing delta sync...');
        return await updateDatabase();
      } else {
        debugPrint('[SyncService] Init is false. Performing full initialization...');
        return await initializeDatabase();
      }
    } catch (e) {
      debugPrint('[SyncService] ensureInitialized error: $e');
      return false;
    }
  }

  /// Full initialization (/user/initialize).
  Future<bool> initializeDatabase() async {
    if (_isSyncing) return false;
    _isSyncing = true;
    _cancelRetry();

    try {
      if (!_db.isOpen) {
        await _db.initialize();
      }

      _status.setSyncProgress(
        titleBuilder: (l10n) => l10n.syncInitTitle,
        messageBuilder: (l10n) => l10n.syncInitMessage,
        progress: 0.15,
      );

      final res = await _gateway.user.initialize();
      if (res['success'] != true) {
        throw Exception('API /user/initialize returned failure');
      }

      final local = res['local'] as Map<String, dynamic>? ?? {};
      final users = (res['users'] as List<dynamic>?) ?? [];
      final chats = (res['chats'] as List<dynamic>?) ?? [];
      final messages = (res['messages'] as List<dynamic>?) ?? [];

      _status.setSyncProgress(
        titleBuilder: (l10n) => l10n.syncProgressTitle,
        messageBuilder: (l10n) =>
            l10n.syncProgressMessage(chats.length, messages.length),
        progress: 0.45,
      );

      // Re-initialize SQLite database
      await _db.clear();
      await _db.initialize();

      // 1. Local user info
      final localUser = local['user'];
      if (localUser is Map<String, dynamic>) {
        await _db.user.add(localUser);
        final eventId = localUser['eventID'] ?? localUser['eventId'] ?? 0;
        await _storage.write(
          key: 'localUserEventID',
          value: eventId.toString(),
        );
      }

      // 2. Pinned chats
      final pinnedChats = local['pinnedChats'];
      if (pinnedChats is List) {
        for (final item in pinnedChats) {
          if (item is Map) {
            final chatUUID = item['chatUUID']?.toString() ?? '';
            final pos = (item['position'] as num?)?.toInt() ?? 0;
            if (chatUUID.isNotEmpty) {
              await _db.chat.pin.add(chatUUID, pos);
            }
          }
        }
      }

      // 3. Batch users & chats
      if (users.isNotEmpty) {
        await _db.user.addMultiple(users);
      }
      if (chats.isNotEmpty) {
        await _db.chat.addMultiple(chats);
      }

      _status.setSyncProgress(
        titleBuilder: (l10n) => l10n.syncMessagesTitle,
        messageBuilder: (l10n) => l10n.syncMessagesMessage,
        progress: 0.75,
      );

      // 4. Batch messages
      if (messages.isNotEmpty) {
        await _db.message.addMultiple(messages);
      }

      _status.setSyncProgress(
        titleBuilder: (l10n) => l10n.syncCacheTitle,
        messageBuilder: (l10n) => l10n.syncCacheMessage,
        progress: 0.90,
      );

      // 5. Mark initialized and synced
      await _storage.write(key: 'init', value: 'true');
      _network.setSynced(true);

      // 6. Hydrate in-memory stores (loads local cache & fetches presence)
      await Future.wait([
        _ref.read(userStoreProvider.notifier).init(),
        _ref.read(chatListProvider.notifier).init(),
      ]);

      _status.dismissStatus('sync_status');

      // Open realtime socket
      await _socket.open();

      _isSyncing = false;
      return true;
    } catch (e) {
      debugPrint('[SyncService] Error during initializeDatabase: $e');
      _network.setSynced(false);
      _status.setSyncError(
        'Initialization failed',
        errorBuilder: (l10n) => l10n.syncErrorInitMessage,
        onRetry: () => initializeDatabase(),
      );
      _isSyncing = false;
      return false;
    }
  }

  /// Incremental delta sync (/user/update).
  Future<bool> updateDatabase() async {
    if (_isSyncing) return false;
    _isSyncing = true;
    _cancelRetry();

    try {
      if (!_db.isOpen) {
        await _db.initialize();
      }

      final userEventIdStr = await _storage.read(key: 'localUserEventID');
      final userEventId = int.tryParse(userEventIdStr ?? '0') ?? 0;
      final gatewayLocal = {'eventID': userEventId};

      final allEvents = await _db.user.update.getAllEventsIDs();
      final gatewayChats = (allEvents['chats'] as List<dynamic>?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          <Map<String, dynamic>>[];
      final gatewayUsers = (allEvents['users'] as List<dynamic>?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          <Map<String, dynamic>>[];

      final res = await _gateway.user.update(
        gatewayLocal,
        gatewayChats,
        gatewayUsers,
      );

      if (res['success'] != true) {
        throw Exception('API /user/update returned failure');
      }

      final users = res['users'];
      final chats = res['chats'];
      final messages = (res['messages'] as List<dynamic>?) ?? [];
      final local = res['local'] as List<dynamic>? ?? [];

      // 1. New chats
      if (chats is Map && chats['new'] is List && (chats['new'] as List).isNotEmpty) {
        await _db.chat.addMultiple(chats['new'] as List);
      }

      // 2. New users
      if (users is Map && users['new'] is List && (users['new'] as List).isNotEmpty) {
        await _db.user.addMultiple(users['new'] as List);
      }

      // 3. New messages
      if (messages.isNotEmpty) {
        await _db.message.addMultiple(messages);
      }

      // 4. Chat events
      if (chats is Map && chats['events'] is List) {
        for (final event in chats['events']) {
          if (event is! Map) continue;
          final type = event['type']?.toString();
          final chatUUID = event['chatUUID']?.toString() ?? '';
          final payload = event['payload'] is Map ? Map<String, dynamic>.from(event['payload'] as Map) : <String, dynamic>{};
          final eventId = (event['id'] as num?)?.toInt() ?? 0;
          final messageId = payload['messageID']?.toString() ?? '';
          final subId = (payload['subID'] as num?)?.toInt() ?? 0;

          switch (type) {
            case SyncChatEventType.messageEdited:
              await _emitter.message.update(
                chatUUID,
                subId,
                messageId,
                'edit',
                eventId,
                payload,
              );
              break;
            case SyncChatEventType.reactionAdded:
              final reactionPayload = Map<String, dynamic>.from(payload);
              reactionPayload['reactedAt'] = event['createdAt'];
              reactionPayload['userUUID'] = event['userUUID'];
              await _emitter.message.update(
                chatUUID,
                subId,
                messageId,
                'reaction_add',
                eventId,
                reactionPayload,
              );
              break;
            case SyncChatEventType.reactionRemoved:
              final reactionPayload = Map<String, dynamic>.from(payload);
              reactionPayload['userUUID'] = event['userUUID'];
              await _emitter.message.update(
                chatUUID,
                subId,
                messageId,
                'reaction_remove',
                eventId,
                reactionPayload,
              );
              break;
            case SyncChatEventType.messageDeleted:
              await _emitter.message.update(
                chatUUID,
                subId,
                messageId,
                'delete',
                eventId,
                payload,
              );
              break;
            case SyncChatEventType.messagePinned:
              final pinPayload = Map<String, dynamic>.from(payload);
              pinPayload['pinnedAt'] = event['createdAt'];
              pinPayload['userUUID'] = event['userUUID'];
              await _emitter.message.update(
                chatUUID,
                subId,
                messageId,
                'pin_add',
                eventId,
                pinPayload,
              );
              break;
            case SyncChatEventType.messageUnpinned:
              await _emitter.message.update(
                chatUUID,
                subId,
                messageId,
                'pin_remove',
                eventId,
                payload,
              );
              break;
            case SyncChatEventType.subCreated:
              await _emitter.chat.update(
                chatUUID,
                'sub_create',
                eventId,
                {
                  'sub': {
                    'id': payload['subID'],
                    'name': payload['name'],
                    'created_at': event['createdAt'],
                  },
                },
              );
              break;
            case SyncChatEventType.subRenamed:
              await _emitter.chat.update(
                chatUUID,
                'sub_rename',
                eventId,
                {
                  'sub': {
                    'id': payload['subID'],
                    'name': payload['name'],
                  },
                },
              );
              break;
            case SyncChatEventType.subDeleted:
              await _emitter.chat.update(
                chatUUID,
                'sub_delete',
                eventId,
                {'subID': payload['subID']},
              );
              break;
            case SyncChatEventType.memberJoined:
              await _emitter.chat.member.join(
                chatUUID,
                {'uuid': event['userUUID']},
                eventId,
              );
              break;
            case SyncChatEventType.memberLeft:
              await _emitter.chat.member.leave(
                chatUUID,
                {'uuid': event['userUUID']},
              );
              break;
            case SyncChatEventType.messageRead:
              await _emitter.message.update(
                chatUUID,
                subId,
                messageId,
                'read',
                eventId,
                {
                  'userUUID': event['userUUID'],
                  'readAt': event['createdAt'],
                },
              );
              break;
          }
        }
      }

      // 5. User profile events
      if (users is Map && users['events'] is List) {
        for (final event in users['events']) {
          if (event is! Map) continue;
          final userUUID = event['userUUID']?.toString() ?? '';
          final eventId = (event['id'] as num?)?.toInt() ?? 0;
          final payload = event['payload'] is Map ? Map<String, dynamic>.from(event['payload'] as Map) : <String, dynamic>{};
          payload['userUUID'] = userUUID;

          await _emitter.user.profile.update(payload, eventId);
        }
      }

      // 6. Local user events
      for (final event in local) {
        if (event is! Map) continue;
        final type = event['type']?.toString();
        final eventId = (event['id'] as num?)?.toInt() ?? 0;
        final payload = event['payload'] is Map ? Map<String, dynamic>.from(event['payload'] as Map) : <String, dynamic>{};
        final chatUUID = (event['chatUUID'] ?? payload['chatUUID'])?.toString() ?? '';

        switch (type) {
          case SyncUserEventType.chatPinned:
            await _emitter.user.setting.chat.update(
              chatUUID,
              'pin_add',
              eventId,
              payload,
            );
            break;
          case SyncUserEventType.chatUnpinned:
            await _emitter.user.setting.chat.update(
              chatUUID,
              'pin_remove',
              eventId,
              payload,
            );
            break;
        }
      }

      // 7. Mark synced before loading in-memory stores
      _network.setSynced(true);

      // 8. Refresh in-memory stores to ensure latest data is loaded
      await Future.wait([
        _ref.read(userStoreProvider.notifier).init(),
        _ref.read(chatListProvider.notifier).init(),
      ]);

      _status.dismissStatus('sync_status');
      _socket.open();

      _isSyncing = false;
      return true;
    } catch (e) {
      debugPrint('[SyncService] Delta sync failed: $e');
      _network.setSynced(false);
      _isSyncing = false;
      _startRetryLoop();
      return false;
    }
  }

  void _startRetryLoop() {
    _cancelRetry();
    _retryCountdown = 5;
    _status.setSyncError(
      'Sync failed',
      errorBuilder: (l10n) => l10n.syncErrorMessage,
      retryCountdown: _retryCountdown,
      onRetry: () => updateDatabase(),
    );

    _retryTimer = Timer.periodic(const Duration(seconds: 1), (timer) async {
      _retryCountdown--;

      if (_retryCountdown > 0) {
        _status.setSyncError(
          'Sync failed',
          errorBuilder: (l10n) => l10n.syncErrorMessage,
          retryCountdown: _retryCountdown,
          onRetry: () => updateDatabase(),
        );
      } else {
        _cancelRetry();
        debugPrint('[SyncService] Retrying delta sync now...');
        final success = await updateDatabase();
        if (success) {
          debugPrint('[SyncService] Retry delta sync successful!');
        }
      }
    });
  }

  void _cancelRetry() {
    _retryTimer?.cancel();
    _retryTimer = null;
    _retryCountdown = 0;
  }

  void dispose() {
    _retryTimer?.cancel();
    _retryTimer = null;
    _retryCountdown = 0;
  }
}

/// Global provider for [SyncService].
final syncServiceProvider = Provider<SyncService>((ref) {
  final service = SyncService(ref);
  ref.onDispose(service.dispose);
  return service;
});
