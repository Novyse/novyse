import 'package:flutter/foundation.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/devices/comms_media_constraints.dart';

/// Per-share screen configuration.
@immutable
class ScreenShareConfig {
  /// One of `fluid_60`, `clarity`, `custom` (see [CommsMediaConstraints]).
  final String mode;

  /// Quality id for `custom` mode (`240p` … `1080p`).
  final String customQuality;

  /// Fps id for `custom` mode (`5` … `120`).
  final String customFps;

  const ScreenShareConfig({
    this.mode = CommsMediaConstraints.defaultShareMode,
    this.customQuality = CommsMediaConstraints.defaultShareCustomQuality,
    this.customFps = CommsMediaConstraints.defaultShareCustomFps,
  });

  /// Defaults snapshot read from the settings map.
  factory ScreenShareConfig.fromSettings(Map<String, Object?> s) {
    return ScreenShareConfig(
      mode: CommsMediaConstraints.readString(
        s,
        CommsMediaConstraints.shareModeKey,
        CommsMediaConstraints.defaultShareMode,
      ),
      customQuality: CommsMediaConstraints.readString(
        s,
        CommsMediaConstraints.shareCustomQualityKey,
        CommsMediaConstraints.defaultShareCustomQuality,
      ),
      customFps: CommsMediaConstraints.readString(
        s,
        CommsMediaConstraints.shareCustomFpsKey,
        CommsMediaConstraints.defaultShareCustomFps,
      ),
    );
  }

  ScreenShareConfig copyWith({
    String? mode,
    String? customQuality,
    String? customFps,
  }) {
    return ScreenShareConfig(
      mode: mode ?? this.mode,
      customQuality: customQuality ?? this.customQuality,
      customFps: customFps ?? this.customFps,
    );
  }

  /// Effective quality id for this config, optionally clamped to source dimensions.
  String resolveEffectiveQuality({int? sourceWidth, int? sourceHeight}) {
    final rawQuality = switch (CommsMediaConstraints.resolveShareMode(mode)) {
      CommsMediaConstraints.shareClarity => CommsMediaConstraints.video1080p,
      CommsMediaConstraints.shareCustom =>
        CommsMediaConstraints.resolveVideoQuality(customQuality),
      _ => CommsMediaConstraints.video1080p,
    };
    if (mode != CommsMediaConstraints.shareCustom &&
        sourceWidth != null &&
        sourceHeight != null) {
      return CommsMediaConstraints.clampQualityToResolution(
        rawQuality,
        sourceWidth,
        sourceHeight,
      );
    }
    return rawQuality;
  }

  /// Effective capture/publish params for this config.
  VideoParameters resolveParams({int? sourceWidth, int? sourceHeight}) {
    final quality = resolveEffectiveQuality(
      sourceWidth: sourceWidth,
      sourceHeight: sourceHeight,
    );
    final fps = resolveMaxFrameRate().round();
    return CommsMediaConstraints.shareParamsFor(quality, fps);
  }

  double resolveMaxFrameRate() {
    final resolved = CommsMediaConstraints.resolveShareMode(mode);
    return switch (resolved) {
      CommsMediaConstraints.shareClarity => 5.0,
      CommsMediaConstraints.shareCustom =>
        CommsMediaConstraints.resolveVideoFps('', customFps).toDouble(),
      _ => 60.0,
    };
  }

  ScreenShareCaptureOptions captureOptions({
    String? sourceId,
    required bool captureScreenAudio,
    int? sourceWidth,
    int? sourceHeight,
  }) {
    return ScreenShareCaptureOptions(
      sourceId: sourceId,
      captureScreenAudio: captureScreenAudio,
      params: resolveParams(
        sourceWidth: sourceWidth,
        sourceHeight: sourceHeight,
      ),
      maxFrameRate: resolveMaxFrameRate(),
    );
  }

  /// Publish options: explicit top encoding + 3-tier simulcast sub-layers.
  VideoPublishOptions publishOptions({int? sourceWidth, int? sourceHeight}) {
    final params = resolveParams(
      sourceWidth: sourceWidth,
      sourceHeight: sourceHeight,
    );
    final quality = resolveEffectiveQuality(
      sourceWidth: sourceWidth,
      sourceHeight: sourceHeight,
    );
    final fps = resolveMaxFrameRate().round();
    final subLayers = CommsMediaConstraints.shareSimulcastLayersFor(
      quality,
      fps,
    );
    return VideoPublishOptions(
      simulcast: true,
      videoCodec: 'vp8',
      screenShareEncoding: params.encoding,
      screenShareSimulcastLayers: subLayers,
      degradationPreference: DegradationPreference.maintainResolution,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is ScreenShareConfig &&
      other.mode == mode &&
      other.customQuality == customQuality &&
      other.customFps == customFps;

  @override
  int get hashCode => Object.hash(mode, customQuality, customFps);
}
