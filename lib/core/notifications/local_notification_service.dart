import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' show Color;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/config/global.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/notifications/notification_actions.dart';
import 'package:novyse/core/notifications/notification_paths_stub.dart'
    if (dart.library.io) 'package:novyse/core/notifications/notification_paths_io.dart'
    as paths;
import 'package:novyse/core/router/navigator_keys.dart';
import 'package:novyse/core/router/router.dart';

typedef NotificationTapCallback = void Function(String? chatUUID);

/// Colored app logo (desktop / web). White silhouette is Android status-bar only.
const _coloredLogoAsset = 'assets/images/logo-novyse.png';

const _darwinChatCategoryId = 'novyse_chat_message';

/// Displays OS notifications.
class LocalNotificationService {
  LocalNotificationService._();
  static final LocalNotificationService instance = LocalNotificationService._();

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();

  static const _androidChannelId = 'novyse_chat_messages';

  bool _initialized = false;
  NotificationTapCallback? onTap;

  final Map<String, List<Message>> _history = {};
  final Map<String, _ChatNotifMeta> _meta = {};

  bool get _isAndroid =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  Future<void> ensureInitialized() async {
    if (_initialized) return;
    final l10n = lookupAppL10n();

    try {
      const android =
          AndroidInitializationSettings('@drawable/notification_icon');

      final darwin = DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
        notificationCategories: [
          DarwinNotificationCategory(
            _darwinChatCategoryId,
            actions: [
              DarwinNotificationAction.text(
                NotificationActionIds.reply,
                l10n.reply,
                buttonTitle: l10n.notifReplySend,
                placeholder: l10n.notifReplyPlaceholder,
              ),
              DarwinNotificationAction.plain(
                NotificationActionIds.markAsRead,
                l10n.notifMarkAsRead,
              ),
            ],
          ),
        ],
      );

      final linux = LinuxInitializationSettings(
        defaultActionName: l10n.notifOpenAction,
        defaultIcon: AssetsLinuxIcon(_coloredLogoAsset),
      );

      final exeDir = paths.notificationExecutableDir();
      final windowsIcon = exeDir != null
          ? '$exeDir/data/flutter_assets/$_coloredLogoAsset'
          : null;

      final windows = WindowsInitializationSettings(
        appName: appName,
        appUserModelId: 'com.novyse.novyse',
        guid: 'de02a385-dc89-49ec-bc00-a984f4a110b1',
        iconPath: windowsIcon,
      );

      final settings = InitializationSettings(
        android: android,
        iOS: darwin,
        macOS: darwin,
        linux: linux,
        windows: windows,
      );

      await _plugin.initialize(
        settings: settings,
        onDidReceiveNotificationResponse: _onResponse,
        onDidReceiveBackgroundNotificationResponse: notificationTapBackground,
      );

      if (_isAndroid) {
        final androidPlugin = _plugin.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
        await androidPlugin?.createNotificationChannel(
          AndroidNotificationChannel(
            _androidChannelId,
            l10n.notifChannelChatMessages,
            description: l10n.notifChannelChatMessagesDesc,
            importance: Importance.high,
            playSound: true,
            enableVibration: true,
          ),
        );
      }

      if (kIsWeb) {
        await _ensureWebPermission();
      }
    } catch (e, st) {
      // Plugin platform channel may be unavailable (e.g. widget tests).
      debugPrint('[LocalNotificationService] init skipped: $e\n$st');
    }

    _initialized = true;
  }

  Future<bool> requestPermissions() async {
    await ensureInitialized();
    try {
      if (kIsWeb) {
        return await _ensureWebPermission();
      }
      if (_isAndroid) {
        final android = _plugin.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
        return await android?.requestNotificationsPermission() ?? false;
      }
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        final ios = _plugin.resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>();
        return await ios?.requestPermissions(
              alert: true,
              badge: true,
              sound: true,
            ) ??
            false;
      }
      if (defaultTargetPlatform == TargetPlatform.macOS) {
        final mac = _plugin.resolvePlatformSpecificImplementation<
            MacOSFlutterLocalNotificationsPlugin>();
        return await mac?.requestPermissions(
              alert: true,
              badge: true,
              sound: true,
            ) ??
            false;
      }
      return true;
    } catch (e, st) {
      debugPrint('[LocalNotificationService] permissions skipped: $e\n$st');
      return false;
    }
  }

  Future<bool> _ensureWebPermission() async {
    final web = _plugin.resolvePlatformSpecificImplementation<
        WebFlutterLocalNotificationsPlugin>();
    if (web == null) return false;

    if (web.permissionStatus == WebNotificationPermission.granted) {
      return true;
    }
    if (web.permissionStatus == WebNotificationPermission.denied) {
      return false;
    }
    return await web.requestNotificationsPermission() ?? false;
  }

  void _onResponse(NotificationResponse response) {
    handleNotificationResponse(response);
  }

  /// Shared by foreground and background notification callbacks.
  static Future<void> handleNotificationResponse(
    NotificationResponse response,
  ) async {
    final payload = _parsePayload(response.payload);
    final chatUUID = payload['chatUUID'] ?? '';
    final messageId = payload['messageId'] ?? '';
    final subID = int.tryParse(payload['subID'] ?? '0') ?? 0;
    final actionId = response.actionId;

    if (actionId == NotificationActionIds.reply) {
      final input = response.input?.trim() ?? '';
      if (input.isNotEmpty && chatUUID.isNotEmpty) {
        await NotificationActions.handleReply(
          chatUUID: chatUUID,
          subID: subID,
          text: input,
        );
      }
      return;
    }

    if (actionId == NotificationActionIds.markAsRead) {
      if (chatUUID.isNotEmpty) {
        await NotificationActions.handleMarkAsRead(
          chatUUID: chatUUID,
          subID: subID,
          messageId: messageId,
        );
        await instance.clearChat(chatUUID);
      }
      return;
    }

    // Default tap -> open chat
    instance.onTap?.call(chatUUID.isEmpty ? null : chatUUID);
    _navigateToChat(chatUUID.isEmpty ? null : chatUUID);
  }

  static Map<String, String> _parsePayload(String? payload) {
    if (payload == null || payload.isEmpty) return {};
    try {
      final map = jsonDecode(payload) as Map<String, dynamic>;
      return map.map((k, v) => MapEntry(k, v?.toString() ?? ''));
    } catch (_) {
      return {'chatUUID': payload};
    }
  }

  static void _navigateToChat(String? chatUUID) {
    if (chatUUID == null || chatUUID.isEmpty) return;
    final context = rootNavigatorKey.currentContext;
    if (context == null) return;
    try {
      final container = ProviderScope.containerOf(context, listen: false);
      container.read(routerProvider).go('/chats/$chatUUID');
    } catch (_) {}
  }

  int _notificationIdForChat(String chatUUID) {
    return chatUUID.hashCode & 0x7fffffff;
  }

  Future<void> clearChat(String chatUUID) async {
    _history.remove(chatUUID);
    _meta.remove(chatUUID);
    await _plugin.cancel(id: _notificationIdForChat(chatUUID));
  }

  /// Append the user's quick-reply to the MessagingStyle thread and refresh.
  Future<void> reflectOwnReply({
    required String chatUUID,
    required String text,
  }) async {
    final content = text.trim();
    final history = _history[chatUUID];
    final meta = _meta[chatUUID];
    if (content.isEmpty || history == null || history.isEmpty || meta == null) {
      await clearChat(chatUUID);
      return;
    }

    final l10n = lookupAppL10n();
    history.add(
      Message(
        content,
        DateTime.now(),
        Person(name: l10n.notifMe, key: 'me'),
      ),
    );
    if (history.length > 10) {
      history.removeRange(0, history.length - 10);
    }

    await _repostChat(
      chatUUID: chatUUID,
      title: meta.title,
      isGroup: meta.isGroup,
      subID: meta.subID,
      messageId: meta.messageId,
      body: content,
      senderName: l10n.notifMe,
    );
  }

  Future<void> showChatMessage({
    required String chatUUID,
    required String title,
    required String body,
    required String senderName,
    String? senderUUID,
    String? messageId,
    int subID = 0,
    DateTime? timestamp,
    bool isGroup = false,
  }) async {
    await ensureInitialized();

    if (kIsWeb) {
      final allowed = await _ensureWebPermission();
      if (!allowed) {
        debugPrint(
          '[LocalNotificationService] Skipping web notification '
          '(permission not granted)',
        );
        return;
      }
    }

    final when = timestamp ?? DateTime.now();
    final person = Person(
      name: senderName,
      key: senderUUID,
    );

    final history = _history.putIfAbsent(chatUUID, () => <Message>[]);
    history.add(Message(body, when, person));
    if (history.length > 10) {
      history.removeRange(0, history.length - 10);
    }

    _meta[chatUUID] = _ChatNotifMeta(
      title: title,
      isGroup: isGroup,
      subID: subID,
      messageId: messageId,
    );

    await _repostChat(
      chatUUID: chatUUID,
      title: title,
      isGroup: isGroup,
      subID: subID,
      messageId: messageId,
      body: body,
      senderName: senderName,
    );
  }

  Future<void> _repostChat({
    required String chatUUID,
    required String title,
    required bool isGroup,
    required int subID,
    String? messageId,
    required String body,
    required String senderName,
  }) async {
    final l10n = lookupAppL10n();
    final history = _history[chatUUID] ?? <Message>[];

    final payloadMap = <String, dynamic>{
      'chatUUID': chatUUID,
      'subID': subID.toString(),
    };
    if (messageId != null) {
      payloadMap['messageId'] = messageId;
    }
    final payload = jsonEncode(payloadMap);

    final androidDetails = AndroidNotificationDetails(
      _androidChannelId,
      l10n.notifChannelChatMessages,
      channelDescription: l10n.notifChannelChatMessagesDesc,
      importance: Importance.high,
      priority: Priority.high,
      category: AndroidNotificationCategory.message,
      channelShowBadge: true,
      styleInformation: MessagingStyleInformation(
        Person(name: l10n.notifMe, key: 'me'),
        conversationTitle: title,
        groupConversation: isGroup,
        messages: List<Message>.from(history),
      ),
      groupKey: chatUUID,
      tag: chatUUID,
      color: const Color(0xFF4F8CFF),
      icon: '@drawable/notification_icon',
      actions: [
        AndroidNotificationAction(
          NotificationActionIds.reply,
          l10n.reply,
          inputs: [
            AndroidNotificationActionInput(
              label: l10n.notifReplyPlaceholder,
            ),
          ],
        ),
        AndroidNotificationAction(
          NotificationActionIds.markAsRead,
          l10n.notifMarkAsRead,
          cancelNotification: true,
        ),
      ],
    );

    final darwinDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      threadIdentifier: 'novyse_chat',
      categoryIdentifier: _darwinChatCategoryId,
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: darwinDetails,
      macOS: darwinDetails,
      linux: LinuxNotificationDetails(
        defaultActionName: l10n.notifOpenAction,
        urgency: LinuxNotificationUrgency.normal,
        icon: AssetsLinuxIcon(_coloredLogoAsset),
        // No text-input reply on Linux, mark as read only.
        actions: [
          LinuxNotificationAction(
            key: NotificationActionIds.markAsRead,
            label: l10n.notifMarkAsRead,
          ),
        ],
      ),
      windows: const WindowsNotificationDetails(),
      web: WebNotificationDetails(
        iconUrl: Uri.parse('assets/$_coloredLogoAsset'),
        // Web actions: no free-text reply API, mark as read only.
        actions: [
          WebNotificationAction(
            action: NotificationActionIds.markAsRead,
            title: l10n.notifMarkAsRead,
          ),
        ],
      ),
    );

    final notificationBody =
        isGroup ? l10n.notifGroupMessageBody(senderName, body) : body;

    try {
      await _plugin.show(
        id: _notificationIdForChat(chatUUID),
        title: title,
        body: notificationBody,
        notificationDetails: details,
        payload: payload,
      );
    } catch (e, st) {
      debugPrint('[LocalNotificationService] show failed: $e\n$st');
    }
  }
}

class _ChatNotifMeta {
  const _ChatNotifMeta({
    required this.title,
    required this.isGroup,
    required this.subID,
    this.messageId,
  });

  final String title;
  final bool isGroup;
  final int subID;
  final String? messageId;
}

@pragma('vm:entry-point')
void notificationTapBackground(NotificationResponse response) {
  LocalNotificationService.handleNotificationResponse(response);
}
