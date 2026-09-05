import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/comms/comms_state.dart';

void main() {
  group('Comms Models & Utilities Tests', () {
    test('extractUserUUID extracts clean UUID from various formats', () {
      expect(
        extractUserUUID('123e4567-e89b-12d3-a456-426614174000_session_abc123'),
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(
        extractUserUUID('123e4567-e89b-12d3-a456-426614174000'),
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(extractUserUUID('user123_456'), 'user123');
      expect(extractUserUUID(''), '');
    });

    test('CommsTileItem correctly models user tile vs screenshare tile', () {
      const userTile = CommsTileItem(
        id: 'user-uuid-1',
        userUUID: 'user-uuid-1',
        isScreenShare: false,
        isLocal: true,
        isSpeaking: true,
      );

      expect(userTile.id, 'user-uuid-1');
      expect(userTile.userUUID, 'user-uuid-1');
      expect(userTile.isScreenShare, false);
      expect(userTile.isLocal, true);
      expect(userTile.isSpeaking, true);
      expect(userTile.hasActiveVideo, false);

      const screenTile = CommsTileItem(
        id: 'track-sid-xyz',
        userUUID: 'user-uuid-1',
        isScreenShare: true,
        isLocal: true,
        trackSid: 'track-sid-xyz',
      );

      expect(screenTile.id, 'track-sid-xyz');
      expect(screenTile.isScreenShare, true);
      expect(screenTile.trackSid, 'track-sid-xyz');
    });

    test('CommsRoomRemoteData.fromApi parses server response correctly', () {
      final rawRoom = {'name': 'chat123_0', 'creationTimeMs': 1700000000000};

      final rawParticipants = [
        {'identity': 'uuid-aaa_session1', 'tracks': []},
        {'identity': 'uuid-bbb_session2', 'tracks': []},
        'uuid-ccc_session3',
      ];

      final data = CommsRoomRemoteData.fromApi(rawRoom, rawParticipants);

      expect(data.roomInfo?['name'], 'chat123_0');
      expect(data.participantUserUUIDs, ['uuid-aaa', 'uuid-bbb', 'uuid-ccc']);
    });
  });

  group('CommsState Tests', () {
    test(
      'isRoomMatch correctly identifies if current session matches room',
      () {
        const defaultState = CommsState();
        expect(defaultState.isRoomMatch('chat-1', 0), false);

        final connectedState = defaultState.copyWith(
          connected: true,
          currentChatUUID: () => 'chat-1',
          currentSub: 0,
        );

        expect(connectedState.isRoomMatch('chat-1', 0), true);
        expect(connectedState.isRoomMatch('chat-1', 1), false);
        expect(connectedState.isRoomMatch('chat-2', 0), false);
      },
    );

    test('isScreenSharing reflects active screen share SIDs', () {
      const state = CommsState();
      expect(state.isScreenSharing, false);

      final sharingState = state.copyWith(
        activeScreenShareTrackSids: {'sid-screen-1'},
      );
      expect(sharingState.isScreenSharing, true);
    });

    test(
      'errorMessageBuilder is properly updated and cleared in CommsState',
      () {
        const state = CommsState();
        expect(state.errorMessageBuilder, isNull);

        final errorState = state.copyWith(
          errorMessageBuilder: () =>
              (l10n) => l10n.commsTokenError,
        );
        expect(errorState.errorMessageBuilder, isNotNull);

        final clearedState = errorState.copyWith(
          errorMessageBuilder: () => null,
        );
        expect(clearedState.errorMessageBuilder, isNull);
      },
    );
  });

  group('CommsNotifier Lifecycle Tests', () {
    test('initial state is default CommsState', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final state = container.read(commsProvider);
      expect(state.connected, false);
      expect(state.connecting, false);
      expect(state.room, isNull);
    });

    test('leave() safely resets state without errors', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(commsProvider.notifier);
      await notifier.leave();

      final state = container.read(commsProvider);
      expect(state.connected, false);
      expect(state.connecting, false);
      expect(state.room, isNull);
    });

    test('multiple concurrent leave() calls are safely guarded', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(commsProvider.notifier);
      await Future.wait([notifier.leave(), notifier.leave(), notifier.leave()]);

      final state = container.read(commsProvider);
      expect(state.connected, false);
      expect(state.room, isNull);
    });
  });
}
