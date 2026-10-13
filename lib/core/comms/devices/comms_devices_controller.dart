import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/devices/comms_device.dart';
import 'package:novyse/core/comms/devices/comms_devices_state.dart';
import 'package:novyse/core/comms/devices/os_default_audio.dart';
import 'package:novyse/core/settings/settings_controller.dart';

/// Single source of truth for OS devices + persisted selection.
///
/// - Enumerates via `Hardware.instance` (same list on desktop/mobile/web,
///   each platform simply exposes what it can).
/// - Persists selection in existing settings keys
///   (`comms.inputDevice`, `comms.outputDevice`, `comms.webcam`).
/// - Live apply is done by `CommsNotifier`;
///   this notifier only enumerates + persists.
class CommsDevicesNotifier extends Notifier<CommsDevicesState> {
  StreamSubscription<List<MediaDevice>>? _deviceSub;
  bool _refreshing = false;

  @override
  CommsDevicesState build() {
    final settings = ref.watch(settingsControllerProvider);
    final selectedAudioInput =
        _savedId(settings[CommsDevicesDefaults.kAudioInputKey]);
    final selectedAudioOutput =
        _savedId(settings[CommsDevicesDefaults.kAudioOutputKey]);
    final selectedVideoInput =
        _savedId(settings[CommsDevicesDefaults.kVideoInputKey]);

    state = CommsDevicesState(
      selectedAudioInputId: selectedAudioInput,
      selectedAudioOutputId: selectedAudioOutput,
      selectedVideoInputId: selectedVideoInput,
      loading: true,
    );

    _deviceSub?.cancel();
    try {
      _deviceSub = Hardware.instance.onDeviceChange.stream.listen((_) {
        unawaited(refresh());
      });
    } catch (_) {}

    ref.onDispose(() {
      unawaited(_deviceSub?.cancel());
      _deviceSub = null;
    });

    Future.microtask(() => refresh());
    return state;
  }

  static String _savedId(Object? raw) {
    if (raw is String && raw.isNotEmpty) return raw;
    return CommsDevicesDefaults.kDefaultId;
  }

  /// Re-enumerate OS devices. Falls back to `Default` when saved id vanished.
  Future<void> refresh() async {
    if (_refreshing) return;
    _refreshing = true;
    try {
      final inputs = await Hardware.instance.audioInputs();
      final outputs = await Hardware.instance.audioOutputs();
      final videos = await Hardware.instance.videoInputs();
      final osDefaults = await readOsDefaultAudioNames();

      final audioInputs = CommsDevicesDefaults.collapseSystemDefault(
        _toDevices(inputs, CommsDeviceKind.audioInput, 'Microphone'),
        osDefaultId: osDefaults.inputId,
        osDefaultLabel: osDefaults.input,
      );
      final audioOutputs = CommsDevicesDefaults.collapseSystemDefault(
        _toDevices(outputs, CommsDeviceKind.audioOutput, 'Speaker'),
        osDefaultId: osDefaults.outputId,
        osDefaultLabel: osDefaults.output,
      );

      state = state.copyWith(
        audioInputs: audioInputs.devices,
        audioOutputs: audioOutputs.devices,
        systemDefaultAudioInput: audioInputs.systemDefault,
        systemDefaultAudioOutput: audioOutputs.systemDefault,
        videoInputs: _toDevices(videos, CommsDeviceKind.videoInput, 'Camera'),
        loading: false,
        errorMessage: () => null,
      );

      _clampSelectionToAvailable();
    } catch (e) {
      debugPrint('[CommsDevices] enumerate failed: $e');
      state = state.copyWith(
        loading: false,
        errorMessage: () => e.toString(),
      );
    } finally {
      _refreshing = false;
    }
  }

  Future<bool> setAudioInput(String id) => _persist(
    key: CommsDevicesDefaults.kAudioInputKey,
    id: id,
    apply: (s) => s.copyWith(selectedAudioInputId: id),
  );

  Future<bool> setAudioOutput(String id) => _persist(
    key: CommsDevicesDefaults.kAudioOutputKey,
    id: id,
    apply: (s) => s.copyWith(selectedAudioOutputId: id),
  );

  Future<bool> setVideoInput(String id) => _persist(
    key: CommsDevicesDefaults.kVideoInputKey,
    id: id,
    apply: (s) => s.copyWith(selectedVideoInputId: id),
  );

  Future<bool> _persist({
    required String key,
    required String id,
    required CommsDevicesState Function(CommsDevicesState) apply,
  }) async {
    state = apply(state);
    try {
      return await ref
          .read(settingsControllerProvider.notifier)
          .set(key, id);
    } catch (e) {
      debugPrint('[CommsDevices] persist $key failed: $e');
      return false;
    }
  }

  void _clampSelectionToAvailable() {
    String clamp(String id, List<CommsDevice> list) {
      if (id == CommsDevicesDefaults.kDefaultId) return id;
      if (list.any((d) => d.id == id)) return id;
      return CommsDevicesDefaults.kDefaultId;
    }

    state = state.copyWith(
      selectedAudioInputId: clamp(
        state.selectedAudioInputId,
        state.audioInputs,
      ),
      selectedAudioOutputId: clamp(
        state.selectedAudioOutputId,
        state.audioOutputs,
      ),
      selectedVideoInputId: clamp(
        state.selectedVideoInputId,
        state.videoInputs,
      ),
    );
  }

  static List<CommsDevice> _toDevices(
    List<MediaDevice> raw,
    CommsDeviceKind kind,
    String fallback,
  ) => [
    for (var i = 0; i < raw.length; i++)
      CommsDevice(
        id: raw[i].deviceId,
        label: raw[i].label.trim().isNotEmpty
            ? raw[i].label.trim()
            : '$fallback ${i + 1}',
        kind: kind,
        groupId: raw[i].groupId,
      ),
  ];
}

final commsDevicesProvider =
    NotifierProvider<CommsDevicesNotifier, CommsDevicesState>(
      CommsDevicesNotifier.new,
    );
