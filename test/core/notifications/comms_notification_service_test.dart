import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/notifications/comms_notification_service.dart';
import 'package:novyse/core/notifications/local_notification_service.dart';
import 'package:novyse/core/notifications/notification_actions.dart';

import '../../helpers/fake_notifications.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late FakeNotifications notifications;
  late CommsNotificationService service;
  final l10n = lookupAppL10n();

  setUp(() async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    notifications = FakeNotifications.install();
    service = CommsNotificationService.instance;
    await service.dismiss();
    service.clearHandlers();
    notifications.clearRecords();
  });

  tearDown(() {
    debugDefaultTargetPlatformOverride = null;
  });

  group('CommsNotificationService showOrUpdate', () {
    test('shows an ongoing notification with chat name and participant count', () async {
      await service.showOrUpdate(
        chatUUID: 'chat-test-1',
        subID: 0,
        chatName: 'Novyse General',
        participantCount: 3,
        isAudioEnabled: true,
        isVideoEnabled: false,
      );

      expect(notifications.showCount, 1);
      final notif = notifications.last;
      expect(notif.id, CommsNotificationService.commsNotificationId);
      expect(notif.title, 'Novyse General');
      expect(notif.body, l10n.notifCommsParticipants(3));

      final payload = jsonDecode(notif.payload!) as Map<String, dynamic>;
      expect(payload['type'], 'comms');
      expect(payload['chatUUID'], 'chat-test-1');
      expect(payload['subID'], '0');

      // Android specific flags
      expect(notif.details?['ongoing'], isTrue);
      expect(notif.details?['autoCancel'], isFalse);
      expect(notif.details?['onlyAlertOnce'], isTrue);
      expect(notif.details?['channelId'], CommsNotificationService.androidChannelId);

      // Actions: mic is enabled -> shows Mute; video is disabled -> shows Turn on camera; leave
      expect(notif.actionIds, [
        NotificationActionIds.commsMute,
        NotificationActionIds.commsCameraOn,
        NotificationActionIds.commsLeave,
      ]);
    });

    test('falls back to localized voice call title when chat name is empty', () async {
      await service.showOrUpdate(
        chatUUID: 'chat-test-2',
        subID: 0,
        chatName: '',
        participantCount: 1,
        isAudioEnabled: false,
        isVideoEnabled: false,
      );

      expect(notifications.showCount, 1);
      final notif = notifications.last;
      expect(notif.title, l10n.notifCommsOngoingCall);
      expect(notif.body, l10n.notifCommsParticipants(1));
    });

    test('updates action buttons when audio is muted or video is enabled', () async {
      // 1. Initially unmuted, video off
      await service.showOrUpdate(
        chatUUID: 'chat-test-1',
        subID: 0,
        chatName: 'Novyse General',
        participantCount: 2,
        isAudioEnabled: true,
        isVideoEnabled: false,
      );

      expect(notifications.last.actionIds, [
        NotificationActionIds.commsMute,
        NotificationActionIds.commsCameraOn,
        NotificationActionIds.commsLeave,
      ]);

      // 2. User mutes themselves, turns video on
      await service.showOrUpdate(
        chatUUID: 'chat-test-1',
        subID: 0,
        chatName: 'Novyse General',
        participantCount: 2,
        isAudioEnabled: false,
        isVideoEnabled: true,
      );

      expect(notifications.showCount, 2);
      expect(notifications.last.actionIds, [
        NotificationActionIds.commsUnmute,
        NotificationActionIds.commsCameraOff,
        NotificationActionIds.commsLeave,
      ]);
    });

    test('updates body when participants join or leave', () async {
      await service.showOrUpdate(
        chatUUID: 'chat-test-1',
        subID: 0,
        chatName: 'Novyse General',
        participantCount: 2,
        isAudioEnabled: true,
        isVideoEnabled: false,
      );
      expect(notifications.last.body, l10n.notifCommsParticipants(2));

      // Someone joins
      await service.showOrUpdate(
        chatUUID: 'chat-test-1',
        subID: 0,
        chatName: 'Novyse General',
        participantCount: 3,
        isAudioEnabled: true,
        isVideoEnabled: false,
      );
      expect(notifications.showCount, 2);
      expect(notifications.last.body, l10n.notifCommsParticipants(3));

      // Someone leaves
      await service.showOrUpdate(
        chatUUID: 'chat-test-1',
        subID: 0,
        chatName: 'Novyse General',
        participantCount: 1,
        isAudioEnabled: true,
        isVideoEnabled: false,
      );
      expect(notifications.showCount, 3);
      expect(notifications.last.body, l10n.notifCommsParticipants(1));
    });

    test('skips posting to OS when notification state has not changed', () async {
      await service.showOrUpdate(
        chatUUID: 'chat-test-1',
        subID: 0,
        chatName: 'Novyse General',
        participantCount: 2,
        isAudioEnabled: true,
        isVideoEnabled: false,
      );
      expect(notifications.showCount, 1);

      // Repeat with exact same parameters
      await service.showOrUpdate(
        chatUUID: 'chat-test-1',
        subID: 0,
        chatName: 'Novyse General',
        participantCount: 2,
        isAudioEnabled: true,
        isVideoEnabled: false,
      );
      expect(notifications.showCount, 1);
    });

    test('iOS darwin categories match state combinations', () {
      expect(
        CommsNotificationService.categoryForState(
          isAudioEnabled: true,
          isVideoEnabled: true,
        ),
        CommsNotificationService.darwinCategoryAudioOnVideoOn,
      );
      expect(
        CommsNotificationService.categoryForState(
          isAudioEnabled: true,
          isVideoEnabled: false,
        ),
        CommsNotificationService.darwinCategoryAudioOnVideoOff,
      );
      expect(
        CommsNotificationService.categoryForState(
          isAudioEnabled: false,
          isVideoEnabled: true,
        ),
        CommsNotificationService.darwinCategoryAudioOffVideoOn,
      );
      expect(
        CommsNotificationService.categoryForState(
          isAudioEnabled: false,
          isVideoEnabled: false,
        ),
        CommsNotificationService.darwinCategoryAudioOffVideoOff,
      );

      final categories = CommsNotificationService.darwinCategories(l10n);
      expect(categories.length, 4);

      final onOffCat = categories.firstWhere(
        (c) => c.identifier == CommsNotificationService.darwinCategoryAudioOnVideoOff,
      );
      expect(
        onOffCat.actions.map((a) => a.identifier).toList(),
        [
          NotificationActionIds.commsMute,
          NotificationActionIds.commsCameraOn,
          NotificationActionIds.commsLeave,
        ],
      );
    });
  });

  group('CommsNotificationService dismiss', () {
    test('cancels ongoing notification by ID', () async {
      await service.showOrUpdate(
        chatUUID: 'chat-test-1',
        subID: 0,
        chatName: 'Novyse General',
        participantCount: 2,
        isAudioEnabled: true,
        isVideoEnabled: false,
      );

      expect(notifications.showCount, 1);

      await service.dismiss();
      expect(notifications.cancelled.length, 1);
      expect(notifications.cancelled.last, CommsNotificationService.commsNotificationId);
    });
  });

  group('CommsNotificationService action handling', () {
    test('routes mute and unmute actions to onSetAudio', () async {
      bool? audioState;
      service.onSetAudio = (enabled) async {
        audioState = enabled;
      };

      await service.handleAction(NotificationActionIds.commsMute);
      expect(audioState, isFalse);

      await service.handleAction(NotificationActionIds.commsUnmute);
      expect(audioState, isTrue);
    });

    test('routes camera off and camera on actions to onSetVideo', () async {
      bool? videoState;
      service.onSetVideo = (enabled) async {
        videoState = enabled;
      };

      await service.handleAction(NotificationActionIds.commsCameraOff);
      expect(videoState, isFalse);

      await service.handleAction(NotificationActionIds.commsCameraOn);
      expect(videoState, isTrue);
    });

    test('routes leave action to onLeave', () async {
      bool leaveCalled = false;
      service.onLeave = () async {
        leaveCalled = true;
      };

      await service.handleAction(NotificationActionIds.commsLeave);
      expect(leaveCalled, isTrue);
    });

    test('dismisses notification on leave action when onLeave is not wired', () async {
      await service.showOrUpdate(
        chatUUID: 'chat-test-1',
        subID: 0,
        chatName: 'Novyse General',
        participantCount: 2,
        isAudioEnabled: true,
        isVideoEnabled: false,
      );

      // onLeave is null, so executeAction should dismiss
      await service.executeAction(NotificationActionIds.commsLeave);
      expect(notifications.cancelled, contains(CommsNotificationService.commsNotificationId));
    });

    test('LocalNotificationService handles comms action without navigating', () async {
      bool? audioState;
      service.onSetAudio = (enabled) async {
        audioState = enabled;
      };

      bool tappedFired = false;
      LocalNotificationService.instance.onTap = (chat, sub) {
        tappedFired = true;
      };

      const response = NotificationResponse(
        notificationResponseType: NotificationResponseType.selectedNotificationAction,
        actionId: NotificationActionIds.commsMute,
        payload: '{"type":"comms","chatUUID":"chat-1","subID":"0"}',
      );

      await LocalNotificationService.handleNotificationResponse(response);

      expect(audioState, isFalse);
      expect(tappedFired, isFalse);
    });

    test('LocalNotificationService handles comms leave action without navigating', () async {
      bool leaveCalled = false;
      service.onLeave = () async {
        leaveCalled = true;
      };

      bool tappedFired = false;
      LocalNotificationService.instance.onTap = (chat, sub) {
        tappedFired = true;
      };

      const response = NotificationResponse(
        notificationResponseType: NotificationResponseType.selectedNotificationAction,
        actionId: NotificationActionIds.commsLeave,
        payload: '{"type":"comms","chatUUID":"chat-1","subID":"0"}',
      );

      await LocalNotificationService.handleNotificationResponse(response);

      expect(leaveCalled, isTrue);
      expect(tappedFired, isFalse);
    });
  });
}
