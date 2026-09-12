import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/widgets.dart';

import 'package:novyse/core/chat/message_format.dart';
import 'package:novyse/core/config/global.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/notifications/fcm_service.dart';
import 'package:novyse/core/notifications/local_notification_service.dart';
import 'package:novyse/core/utils/platform.dart';

/// Top-level FCM background handler (must be a top-level or static function).
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp();
    }
  } catch (e) {
    debugPrint('[FCM background] Firebase init: $e');
  }

  await LocalNotificationService.instance.ensureInitialized();
  await NotificationManager.instance.displayFromRemoteData(
    message.data,
    source: NotificationSource.fcm,
    force: true,
  );
}

enum NotificationSource { socket, fcm }

/// Hybrid notification orchestrator
class NotificationManager {
  NotificationManager._();
  static final NotificationManager instance = NotificationManager._();

  final Set<String> _processedIds = {};
  AppLifecycleState _lifecycle = AppLifecycleState.resumed;

  bool Function()? isSocketOpen;
  String? Function()? activeChatUUID;
  String? Function()? localUserUUID;
  Map<String, dynamic>? Function(String uuid)? getChat;
  Map<String, dynamic>? Function(String uuid)? getUser;
  bool Function(String chatUUID)? isChatMuted;

  void setLifecycle(AppLifecycleState state) {
    _lifecycle = state;
  }

  bool get _isAppActive =>
      _lifecycle == AppLifecycleState.resumed ||
      _lifecycle == AppLifecycleState.inactive;

  Future<void> init() async {
    await LocalNotificationService.instance.ensureInitialized();

    if (FcmService.instance.isSupported) {
      try {
        if (Firebase.apps.isEmpty) {
          await Firebase.initializeApp();
        }
        await FcmService.instance.init(
          onMessage: (message) {
            handleRemoteMessage(message);
          },
        );
      } catch (e, st) {
        debugPrint('[NotificationManager] FCM init skipped: $e\n$st');
      }
    }
  }

  Future<void> requestPermissions() async {
    await LocalNotificationService.instance.requestPermissions();
    if (currentOS == AppOS.android || currentOS == AppOS.ios) {
      await FcmService.instance.updateToken();
    }
  }

  Future<void> syncPushToken() => FcmService.instance.updateToken();

  Future<void> handleRemoteMessage(RemoteMessage message) async {
    if (_isAppActive && (isSocketOpen?.call() ?? false)) {
      debugPrint(
        '[NotificationManager] Skip FCM (app active + socket open)',
      );
      return;
    }
    await displayFromRemoteData(
      message.data,
      source: NotificationSource.fcm,
    );
  }

  /// Called for Socket.IO / in-app inbound messages.
  Future<void> handleInboundMessage(Map<String, dynamic> message) async {
    await displayFromRemoteData(
      {
        'chatUUID': message['chatUUID'] ?? message['chat_uuid'],
        'message': message,
        'senderUUID': message['senderUUID'] ?? message['userUUID'],
      },
      source: NotificationSource.socket,
    );
  }

  Future<void> displayFromRemoteData(
    Map<String, dynamic> data, {
    required NotificationSource source,
    bool force = false,
  }) async {
    Map<String, dynamic>? messageData;
    final rawMessage = data['message'];
    if (rawMessage is String && rawMessage.isNotEmpty) {
      try {
        messageData = Map<String, dynamic>.from(jsonDecode(rawMessage) as Map);
      } catch (_) {}
    } else if (rawMessage is Map) {
      messageData = Map<String, dynamic>.from(rawMessage);
    }

    final chatUUID =
        (data['chatUUID'] ?? messageData?['chatUUID'] ?? '').toString();
    if (chatUUID.isEmpty) return;

    if (isChatMuted?.call(chatUUID) == true) return;

    final senderUUID = (data['senderUUID'] ??
            messageData?['senderUUID'] ??
            messageData?['userUUID'] ??
            '')
        .toString();
    final localUUID = localUserUUID?.call();
    if (localUUID != null &&
        localUUID.isNotEmpty &&
        senderUUID.isNotEmpty &&
        senderUUID == localUUID) {
      return;
    }

    if (!force &&
        source == NotificationSource.socket &&
        _isAppActive &&
        activeChatUUID?.call() == chatUUID) {
      return;
    }

    if (!force && _isAppActive && activeChatUUID?.call() == chatUUID) {
      return;
    }

    final messageId = (messageData?['id'] ??
            data['messageId'] ??
            data['messageID'] ??
            data['id'] ??
            '')
        .toString();
    if (messageId.isNotEmpty) {
      if (_processedIds.contains(messageId)) return;
      _processedIds.add(messageId);
      if (_processedIds.length > 200) {
        _processedIds.remove(_processedIds.first);
      }
    }

    final chat = getChat?.call(chatUUID);
    final chatType = (chat?['type'] ?? 'DM').toString();
    final isGroup = chatType != 'DM';

    final l10n = lookupAppL10n();
    final sender = senderUUID.isNotEmpty ? getUser?.call(senderUUID) : null;
    final senderName = (sender?['name'] ??
            sender?['displayName'] ??
            l10n.notifUnknownSender)
        .toString();

    String title;
    if (isGroup) {
      title = (chat?['name'] ?? data['chatName'] ?? appName).toString();
    } else {
      title = senderName;
    }

    String body;
    if (messageData != null) {
      final formatted = formatMessage(
        messageData,
        l10n: l10n,
        localUserUUID: localUUID,
        getUser: (uuid) => getUser?.call(uuid),
      );
      body = (formatted['content'] ?? '').toString();
    } else {
      body = (data['content'] ??
              data['body'] ??
              messageData?['content'] ??
              ' ')
          .toString();
    }
    if (body.trim().isEmpty) body = ' ';

    DateTime? timestamp;
    final at = messageData?['at'] ?? messageData?['createdAt'];
    if (at != null) {
      timestamp = DateTime.tryParse(at.toString())?.toLocal();
    }

    final subID = messageData?['subID'];

    await LocalNotificationService.instance.showChatMessage(
      chatUUID: chatUUID,
      title: title,
      body: body,
      senderName: senderName,
      senderUUID: senderUUID.isEmpty ? null : senderUUID,
      messageId: messageId.isEmpty ? null : messageId,
      subID: subID,
      timestamp: timestamp,
      isGroup: isGroup,
    );
  }

  Future<void> clearChat(String chatUUID) {
    return LocalNotificationService.instance.clearChat(chatUUID);
  }
}
