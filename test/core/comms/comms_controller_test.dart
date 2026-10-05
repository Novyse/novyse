import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_state.dart';
import 'package:novyse/core/settings/settings_controller.dart';

/// The hardware/view state transitions on [CommsNotifier] are pure `copyWith`
/// arithmetic that does not need a LiveKit room, so they can be driven through
/// a bare [ProviderContainer]. `togglePin`/`toggleFullscreen`/`clearError` all
/// use the `() => value` wrapper form, which is the easy way to clear a
/// nullable field.
void main() {
  late ProviderContainer container;
  late CommsNotifier notifier;

  CommsState read() => container.read(commsProvider);

  setUp(() {
    container = ProviderContainer();
    notifier = container.read(commsProvider.notifier);
  });

  tearDown(() => container.dispose());

  group('togglePin', () {
    test('pins a stream', () {
      notifier.togglePin('TR_1');

      expect(read().pinnedStreamId, 'TR_1');
    });

    test('replaces an existing pin', () {
      notifier.togglePin('TR_1');
      notifier.togglePin('TR_2');

      expect(read().pinnedStreamId, 'TR_2');
    });

    test('unpins when the same stream is toggled again', () {
      notifier.togglePin('TR_1');
      notifier.togglePin('TR_1');

      expect(read().pinnedStreamId, isNull);
    });
  });

  group('toggleFullscreen', () {
    test('enters fullscreen for a stream', () {
      notifier.toggleFullscreen('TR_1');

      expect(read().fullscreenStreamId, 'TR_1');
    });

    test('replaces an existing fullscreen stream', () {
      notifier.toggleFullscreen('TR_1');
      notifier.toggleFullscreen('TR_2');

      expect(read().fullscreenStreamId, 'TR_2');
    });

    test('exits when the same stream is toggled again', () {
      notifier.toggleFullscreen('TR_1');
      notifier.toggleFullscreen('TR_1');

      expect(read().fullscreenStreamId, isNull);
    });

    test('does not disturb the pin', () {
      notifier.togglePin('TR_1');
      notifier.toggleFullscreen('TR_1');

      expect(read().pinnedStreamId, 'TR_1');
      expect(read().fullscreenStreamId, 'TR_1');
    });
  });

  group('exitFullscreen', () {
    test('clears the fullscreen stream', () {
      notifier.toggleFullscreen('TR_1');

      notifier.exitFullscreen();

      expect(read().fullscreenStreamId, isNull);
    });

    test('is a no-op when nothing is fullscreen', () {
      final before = read();

      notifier.exitFullscreen();

      expect(read(), same(before));
    });
  });

  group('setRemoteVolume', () {
    test('records a volume for a participant', () {
      notifier.setRemoteVolume('u1', 0.4);

      expect(read().remoteVolumes, {'u1': 0.4});
    });

    test('keeps volumes for other participants', () {
      notifier.setRemoteVolume('u1', 0.4);
      notifier.setRemoteVolume('u2', 0.8);

      expect(read().remoteVolumes, {'u1': 0.4, 'u2': 0.8});
    });

    test('overwrites an existing volume', () {
      notifier.setRemoteVolume('u1', 0.4);
      notifier.setRemoteVolume('u1', 0.1);

      expect(read().remoteVolumes, {'u1': 0.1});
    });

    test('clamps values above 1.0 to the linear maximum', () {
      notifier.setRemoteVolume('u1', 1.5);

      expect(read().remoteVolumes, {'u1': 1.0});
    });

    test('does not mutate the previous map', () {
      notifier.setRemoteVolume('u1', 0.4);
      final before = read().remoteVolumes;

      notifier.setRemoteVolume('u2', 0.8);

      expect(before, {'u1': 0.4});
    });
  });

  group('toggleLocalMute', () {
    test('mutes an unmuted participant', () {
      notifier.toggleLocalMute('u1');

      expect(read().localMuted, {'u1': true});
    });

    test('unmutes a muted participant', () {
      notifier.toggleLocalMute('u1');
      notifier.toggleLocalMute('u1');

      expect(read().localMuted, {'u1': false});
    });

    test('tracks participants independently', () {
      notifier.toggleLocalMute('u1');
      notifier.toggleLocalMute('u2');
      notifier.toggleLocalMute('u1');

      expect(read().localMuted, {'u1': false, 'u2': true});
    });
  });

  group('toggleAudioOutput', () {
    test('flips deafen even with no room', () {
      expect(read().isAudioOutputEnabled, isTrue);

      notifier.toggleAudioOutput();

      expect(read().isAudioOutputEnabled, isFalse);
    });

    test('flips back', () {
      notifier.toggleAudioOutput();
      notifier.toggleAudioOutput();

      expect(read().isAudioOutputEnabled, isTrue);
    });
  });

  group('clearError', () {
    test('clears a plain error message', () {
      container.read(commsProvider.notifier).state = const CommsState(
        errorMessage: 'boom',
      );

      notifier.clearError();

      expect(read().errorMessage, isNull);
    });

    test('clears a localized error builder', () {
      container.read(commsProvider.notifier).state = CommsState(
        errorMessageBuilder: (l10n) => 'localized',
      );

      notifier.clearError();

      expect(read().errorMessageBuilder, isNull);
    });
  });

  group('guards that need no room', () {
    test('toggleAudio and toggleVideo are no-ops without a room', () {
      final before = read();

      expect(() => notifier.toggleAudio(), returnsNormally);
      expect(() => notifier.toggleVideo(), returnsNormally);
      expect(read(), same(before));
    });

    test('startScreenShare is a no-op without a room', () async {
      await expectLater(notifier.startScreenShare(), completes);
      expect(read().activeScreenShareTrackSids, isEmpty);
    });

    test('stopScreenShare is a no-op without a room', () async {
      await expectLater(notifier.stopScreenShare('TR_1'), completes);
      expect(read().activeScreenShareTrackSids, isEmpty);
    });

    test(
      'stopScreenShare without a room and without a sid is a no-op',
      () async {
        await expectLater(notifier.stopScreenShare(), completes);
      },
    );

    test('switchCamera is a no-op without a room', () async {
      await expectLater(notifier.switchCamera(), completion(isNull));
    });
  });

  group('initial state', () {
    test('starts disconnected with audio output on', () {
      expect(read().connected, isFalse);
      expect(read().connecting, isFalse);
      expect(read().room, isNull);
      expect(read().isAudioOutputEnabled, isTrue);
      expect(read().isAudioEnabled, isFalse);
      expect(read().isVideoEnabled, isFalse);
      expect(read().currentSub, 0);
      expect(read().isScreenSharing, isFalse);
    });

    test('isRoomMatch requires connection and an exact chat/sub match', () {
      container.read(commsProvider.notifier).state = const CommsState(
        connected: true,
        currentChatUUID: 'chat-1',
        currentSub: 2,
      );

      expect(read().isRoomMatch('chat-1', 2), isTrue);
      expect(read().isRoomMatch('chat-1', 3), isFalse);
      expect(read().isRoomMatch('chat-2', 2), isFalse);
    });

    test('isRoomMatch is false while disconnected', () {
      container.read(commsProvider.notifier).state = const CommsState(
        connected: false,
        currentChatUUID: 'chat-1',
      );

      expect(read().isRoomMatch('chat-1', 0), isFalse);
    });

    test('isScreenSharing follows the active share set', () {
      container.read(commsProvider.notifier).state = const CommsState(
        activeScreenShareTrackSids: {'TR_1'},
      );

      expect(read().isScreenSharing, isTrue);
    });
  });

  group('volume persistence', () {
    ProviderContainer containerWithSettings(Map<String, Object?> preset) {
      final c = ProviderContainer(
        overrides: [
          settingsControllerProvider.overrideWith(
            () => _StubSettingsController(preset),
          ),
        ],
      );
      addTearDown(c.dispose);
      return c;
    }

    Map<String, Object?> writtenOf(ProviderContainer c) =>
        (c.read(settingsControllerProvider.notifier)
                as _StubSettingsController)
            .written;

    test('hydrates saved volumes from settings', () async {
      final c = containerWithSettings({
        CommsNotifier.volumesSettingsKey: {'u1_s1': 0.5},
      });
      c.read(commsProvider.notifier);
      await Future<void>.delayed(Duration.zero);

      expect(c.read(commsProvider).remoteVolumes, {'u1_s1': 0.5});
    });

    test('starts empty without saved volumes', () {
      final c = containerWithSettings({});

      expect(c.read(commsProvider).remoteVolumes, isEmpty);
    });

    test('setRemoteVolume persists with debounce', () async {
      final c = containerWithSettings({});
      final n = c.read(commsProvider.notifier);

      await n.setRemoteVolume('u1_s1', 0.4);
      // Debounced: not written yet.
      expect(writtenOf(c), isEmpty);

      await Future<void>.delayed(
        CommsNotifier.volumesPersistDebounce + const Duration(milliseconds: 100),
      );
      expect(writtenOf(c)[CommsNotifier.volumesSettingsKey], {'u1_s1': 0.4});
    });

    test('setRemoteVolume with persist false skips settings', () async {
      final c = containerWithSettings({});
      final n = c.read(commsProvider.notifier);

      await n.setRemoteVolume('TR_ephemeral', 0.4, persist: false);
      expect(c.read(commsProvider).remoteVolumes, {'TR_ephemeral': 0.4});

      await Future<void>.delayed(
        CommsNotifier.volumesPersistDebounce + const Duration(milliseconds: 100),
      );
      expect(writtenOf(c), isEmpty);
    });

    test('clearRemoteVolume removes and persists immediately', () async {
      final c = containerWithSettings({
        CommsNotifier.volumesSettingsKey: {'u1_s1': 0.5, 'u2_s9': 0.7},
      });
      final n = c.read(commsProvider.notifier);
      await Future<void>.delayed(Duration.zero);

      await n.clearRemoteVolume('u1_s1');

      expect(c.read(commsProvider).remoteVolumes, {'u2_s9': 0.7});
      expect(writtenOf(c)[CommsNotifier.volumesSettingsKey], {'u2_s9': 0.7});
    });

    test('clearAllRemoteVolumes empties and persists immediately', () async {
      final c = containerWithSettings({
        CommsNotifier.volumesSettingsKey: {'u1_s1': 0.5},
      });
      final n = c.read(commsProvider.notifier);
      await Future<void>.delayed(Duration.zero);

      await n.clearAllRemoteVolumes();

      expect(c.read(commsProvider).remoteVolumes, isEmpty);
      expect(writtenOf(c)[CommsNotifier.volumesSettingsKey], isEmpty);
    });

    test('leave keeps saved volumes', () async {
      final c = containerWithSettings({});
      final n = c.read(commsProvider.notifier);

      await n.setRemoteVolume('u1_s1', 0.3);
      await n.leave();

      expect(c.read(commsProvider).remoteVolumes, {'u1_s1': 0.3});
    });
  });
}

/// In-memory settings stub recording writes instead of touching SQLite.
class _StubSettingsController extends SettingsController {
  _StubSettingsController(this.preset);

  final Map<String, Object?> preset;
  final Map<String, Object?> written = {};

  @override
  Map<String, Object?> build() => Map<String, Object?>.of(preset);

  @override
  Future<bool> set(String settingKey, Object? value) async {
    written[settingKey] = value;
    state = {...state, settingKey: value};
    return true;
  }
}
