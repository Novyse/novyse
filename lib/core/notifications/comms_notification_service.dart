import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' show Color;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/notifications/local_notification_service.dart';
import 'package:novyse/core/notifications/notification_actions.dart';
import 'package:novyse/core/notifications/notification_bridge.dart';

/// Manages ongoing/permanent mobile notifications for active voice communications (comms).
class CommsNotificationService {
  CommsNotificationService._({FlutterLocalNotificationsPlugin? plugin})
      : _customPlugin = plugin;

  static final CommsNotificationService instance =
      CommsNotificationService._();

  @visibleForTesting
  factory CommsNotificationService.testInstance(
    FlutterLocalNotificationsPlugin plugin,
  ) => CommsNotificationService._(plugin: plugin);

  final FlutterLocalNotificationsPlugin? _customPlugin;

  FlutterLocalNotificationsPlugin get _plugin =>
      _customPlugin ?? LocalNotificationService.instance.plugin;

  static const String androidChannelId = 'novyse_comms_call';
  static const int commsNotificationId = 0x434F4D4D; // 1129270605 ('COMM')

  static const String darwinCategoryAudioOnVideoOn =
      'novyse_comms_audio_on_video_on';
  static const String darwinCategoryAudioOnVideoOff =
      'novyse_comms_audio_on_video_off';
  static const String darwinCategoryAudioOffVideoOn =
      'novyse_comms_audio_off_video_on';
  static const String darwinCategoryAudioOffVideoOff =
      'novyse_comms_audio_off_video_off';

  /// Active action callbacks wired from the main isolate
  Future<void> Function(bool enabled)? onSetAudio;
  Future<void> Function()? onToggleAudio;
  Future<void> Function(bool enabled)? onSetVideo;
  Future<void> Function()? onToggleVideo;
  Future<void> Function()? onLeave;

  bool get hasHandlers =>
      onSetAudio != null ||
      onToggleAudio != null ||
      onSetVideo != null ||
      onToggleVideo != null ||
      onLeave != null;

  void clearHandlers() {
    onSetAudio = null;
    onToggleAudio = null;
    onSetVideo = null;
    onToggleVideo = null;
    onLeave = null;
  }

  /// Whether ongoing comms notification is supported on the current platform (mobile: Android & iOS).
  static bool get isSupported =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  static bool isCommsAction(String actionId) {
    return actionId == NotificationActionIds.commsMute ||
        actionId == NotificationActionIds.commsUnmute ||
        actionId == NotificationActionIds.commsToggleMic ||
        actionId == NotificationActionIds.commsCameraOn ||
        actionId == NotificationActionIds.commsCameraOff ||
        actionId == NotificationActionIds.commsToggleVideo ||
        actionId == NotificationActionIds.commsLeave;
  }

  static List<DarwinNotificationCategory> darwinCategories(
    AppLocalizations l10n,
  ) {
    return [
      DarwinNotificationCategory(
        darwinCategoryAudioOnVideoOn,
        actions: [
          DarwinNotificationAction.plain(
            NotificationActionIds.commsMute,
            l10n.notifCommsMute,
          ),
          DarwinNotificationAction.plain(
            NotificationActionIds.commsCameraOff,
            l10n.notifCommsVideoOff,
          ),
          DarwinNotificationAction.plain(
            NotificationActionIds.commsLeave,
            l10n.notifCommsLeave,
            options: {
              DarwinNotificationActionOption.destructive,
            },
          ),
        ],
      ),
      DarwinNotificationCategory(
        darwinCategoryAudioOnVideoOff,
        actions: [
          DarwinNotificationAction.plain(
            NotificationActionIds.commsMute,
            l10n.notifCommsMute,
          ),
          DarwinNotificationAction.plain(
            NotificationActionIds.commsCameraOn,
            l10n.notifCommsVideoOn,
          ),
          DarwinNotificationAction.plain(
            NotificationActionIds.commsLeave,
            l10n.notifCommsLeave,
            options: {
              DarwinNotificationActionOption.destructive,
            },
          ),
        ],
      ),
      DarwinNotificationCategory(
        darwinCategoryAudioOffVideoOn,
        actions: [
          DarwinNotificationAction.plain(
            NotificationActionIds.commsUnmute,
            l10n.notifCommsUnmute,
          ),
          DarwinNotificationAction.plain(
            NotificationActionIds.commsCameraOff,
            l10n.notifCommsVideoOff,
          ),
          DarwinNotificationAction.plain(
            NotificationActionIds.commsLeave,
            l10n.notifCommsLeave,
            options: {
              DarwinNotificationActionOption.destructive,
            },
          ),
        ],
      ),
      DarwinNotificationCategory(
        darwinCategoryAudioOffVideoOff,
        actions: [
          DarwinNotificationAction.plain(
            NotificationActionIds.commsUnmute,
            l10n.notifCommsUnmute,
          ),
          DarwinNotificationAction.plain(
            NotificationActionIds.commsCameraOn,
            l10n.notifCommsVideoOn,
          ),
          DarwinNotificationAction.plain(
            NotificationActionIds.commsLeave,
            l10n.notifCommsLeave,
            options: {
              DarwinNotificationActionOption.destructive,
            },
          ),
        ],
      ),
    ];
  }

  @visibleForTesting
  static String categoryForState({
    required bool isAudioEnabled,
    required bool isVideoEnabled,
  }) =>
      _categoryForState(
        isAudioEnabled: isAudioEnabled,
        isVideoEnabled: isVideoEnabled,
      );

  static String _categoryForState({
    required bool isAudioEnabled,
    required bool isVideoEnabled,
  }) {
    if (isAudioEnabled && isVideoEnabled) {
      return darwinCategoryAudioOnVideoOn;
    } else if (isAudioEnabled && !isVideoEnabled) {
      return darwinCategoryAudioOnVideoOff;
    } else if (!isAudioEnabled && isVideoEnabled) {
      return darwinCategoryAudioOffVideoOn;
    } else {
      return darwinCategoryAudioOffVideoOff;
    }
  }

  String? _lastChatUUID;
  int? _lastSubID;
  String? _lastChatName;
  int? _lastParticipantCount;
  bool? _lastIsAudioEnabled;
  bool? _lastIsVideoEnabled;

  /// Shows or updates the ongoing call notification.
  Future<void> showOrUpdate({
    required String chatUUID,
    required int subID,
    required String chatName,
    required int participantCount,
    required bool isAudioEnabled,
    required bool isVideoEnabled,
  }) async {
    if (!isSupported) return;

    if (_lastChatUUID == chatUUID &&
        _lastSubID == subID &&
        _lastChatName == chatName &&
        _lastParticipantCount == participantCount &&
        _lastIsAudioEnabled == isAudioEnabled &&
        _lastIsVideoEnabled == isVideoEnabled) {
      return;
    }

    _lastChatUUID = chatUUID;
    _lastSubID = subID;
    _lastChatName = chatName;
    _lastParticipantCount = participantCount;
    _lastIsAudioEnabled = isAudioEnabled;
    _lastIsVideoEnabled = isVideoEnabled;

    final l10n = lookupAppL10n();
    final title = chatName.isNotEmpty ? chatName : l10n.notifCommsOngoingCall;
    final body = l10n.notifCommsParticipants(participantCount);

    final payload = jsonEncode({
      'type': 'comms',
      'chatUUID': chatUUID,
      'subID': subID.toString(),
    });

    final androidDetails = AndroidNotificationDetails(
      androidChannelId,
      l10n.notifChannelComms,
      channelDescription: l10n.notifChannelCommsDesc,
      importance: Importance.low,
      priority: Priority.low,
      category: AndroidNotificationCategory.call,
      ongoing: true,
      autoCancel: false,
      onlyAlertOnce: true,
      showWhen: false,
      color: const Color(0xFF4F8CFF),
      icon: '@drawable/notification_icon',
      actions: [
        AndroidNotificationAction(
          isAudioEnabled
              ? NotificationActionIds.commsMute
              : NotificationActionIds.commsUnmute,
          isAudioEnabled ? l10n.notifCommsMute : l10n.notifCommsUnmute,
          showsUserInterface: false,
          cancelNotification: false,
        ),
        AndroidNotificationAction(
          isVideoEnabled
              ? NotificationActionIds.commsCameraOff
              : NotificationActionIds.commsCameraOn,
          isVideoEnabled ? l10n.notifCommsVideoOff : l10n.notifCommsVideoOn,
          showsUserInterface: false,
          cancelNotification: false,
        ),
        AndroidNotificationAction(
          NotificationActionIds.commsLeave,
          l10n.notifCommsLeave,
          showsUserInterface: false,
          cancelNotification: true,
        ),
      ],
    );

    final darwinCategory = _categoryForState(
      isAudioEnabled: isAudioEnabled,
      isVideoEnabled: isVideoEnabled,
    );

    final darwinDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: false,
      presentSound: false,
      threadIdentifier: 'novyse_comms',
      categoryIdentifier: darwinCategory,
      interruptionLevel: InterruptionLevel.active,
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: darwinDetails,
    );

    try {
      await _plugin.show(
        id: commsNotificationId,
        title: title,
        body: body,
        notificationDetails: details,
        payload: payload,
      );
    } catch (e, st) {
      debugPrint('[CommsNotificationService] show failed: $e\n$st');
    }
  }

  /// Cancels and dismisses the ongoing comms notification.
  Future<void> dismiss() async {
    _lastChatUUID = null;
    _lastSubID = null;
    _lastChatName = null;
    _lastParticipantCount = null;
    _lastIsAudioEnabled = null;
    _lastIsVideoEnabled = null;

    try {
      await _plugin.cancel(id: commsNotificationId);
    } catch (e) {
      debugPrint('[CommsNotificationService] cancel failed: $e');
    }
  }

  /// Handles incoming action button presses from foreground or background callbacks.
  Future<void> handleAction(String actionId) async {
    if (hasHandlers) {
      await executeAction(actionId);
    } else {
      NotificationBridge.forwardMessage({
        'type': 'comms_action',
        'actionId': actionId,
      });
    }
  }

  /// Executes action on the current isolate.
  Future<void> executeAction(String actionId) async {
    switch (actionId) {
      case NotificationActionIds.commsMute:
        if (onSetAudio != null) {
          await onSetAudio!(false);
        } else if (onToggleAudio != null) {
          await onToggleAudio!();
        }
        break;
      case NotificationActionIds.commsUnmute:
        if (onSetAudio != null) {
          await onSetAudio!(true);
        } else if (onToggleAudio != null) {
          await onToggleAudio!();
        }
        break;
      case NotificationActionIds.commsToggleMic:
        if (onToggleAudio != null) {
          await onToggleAudio!();
        }
        break;
      case NotificationActionIds.commsCameraOff:
        if (onSetVideo != null) {
          await onSetVideo!(false);
        } else if (onToggleVideo != null) {
          await onToggleVideo!();
        }
        break;
      case NotificationActionIds.commsCameraOn:
        if (onSetVideo != null) {
          await onSetVideo!(true);
        } else if (onToggleVideo != null) {
          await onToggleVideo!();
        }
        break;
      case NotificationActionIds.commsToggleVideo:
        if (onToggleVideo != null) {
          await onToggleVideo!();
        }
        break;
      case NotificationActionIds.commsLeave:
        if (onLeave != null) {
          await onLeave!();
        } else {
          await dismiss();
        }
        break;
    }
  }
}
