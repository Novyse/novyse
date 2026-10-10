import 'package:flutter/foundation.dart';
import 'package:novyse/core/comms/devices/comms_device.dart';

/// Immutable snapshot of enumerated devices + user selection.
///
/// Selections are persisted as plain `deviceId` strings in settings
/// (`comms.inputDevice`, `comms.outputDevice`, `comms.webcam`).
/// `'default'` = system default.
@immutable
class CommsDevicesState {
  final List<CommsDevice> audioInputs;
  final List<CommsDevice> audioOutputs;
  final List<CommsDevice> videoInputs;
  final String selectedAudioInputId;
  final String selectedAudioOutputId;
  final String selectedVideoInputId;
  final bool loading;
  final bool permissionRequested;
  final String? errorMessage;

  const CommsDevicesState({
    this.audioInputs = const [],
    this.audioOutputs = const [],
    this.videoInputs = const [],
    this.selectedAudioInputId = CommsDevicesDefaults.kDefaultId,
    this.selectedAudioOutputId = CommsDevicesDefaults.kDefaultId,
    this.selectedVideoInputId = CommsDevicesDefaults.kDefaultId,
    this.loading = true,
    this.permissionRequested = false,
    this.errorMessage,
  });

  List<CommsDevice> devicesFor(CommsDeviceKind kind) => switch (kind) {
    CommsDeviceKind.audioInput => audioInputs,
    CommsDeviceKind.audioOutput => audioOutputs,
    CommsDeviceKind.videoInput => videoInputs,
  };

  String selectedIdFor(CommsDeviceKind kind) => switch (kind) {
    CommsDeviceKind.audioInput => selectedAudioInputId,
    CommsDeviceKind.audioOutput => selectedAudioOutputId,
    CommsDeviceKind.videoInput => selectedVideoInputId,
  };

  /// Display label for the current selection (`Default` fallback included).
  String displayLabelFor(CommsDeviceKind kind) {
    final id = selectedIdFor(kind);
    if (id == CommsDevicesDefaults.kDefaultId) return 'Default';
    final match = devicesFor(kind).where((d) => d.id == id).firstOrNull;
    return match?.label ?? 'Default';
  }

  CommsDevicesState copyWith({
    List<CommsDevice>? audioInputs,
    List<CommsDevice>? audioOutputs,
    List<CommsDevice>? videoInputs,
    String? selectedAudioInputId,
    String? selectedAudioOutputId,
    String? selectedVideoInputId,
    bool? loading,
    bool? permissionRequested,
    String? Function()? errorMessage,
  }) {
    return CommsDevicesState(
      audioInputs: audioInputs ?? this.audioInputs,
      audioOutputs: audioOutputs ?? this.audioOutputs,
      videoInputs: videoInputs ?? this.videoInputs,
      selectedAudioInputId: selectedAudioInputId ?? this.selectedAudioInputId,
      selectedAudioOutputId:
          selectedAudioOutputId ?? this.selectedAudioOutputId,
      selectedVideoInputId: selectedVideoInputId ?? this.selectedVideoInputId,
      loading: loading ?? this.loading,
      permissionRequested: permissionRequested ?? this.permissionRequested,
      errorMessage: errorMessage != null
          ? errorMessage()
          : this.errorMessage,
    );
  }
}
