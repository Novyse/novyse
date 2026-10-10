import 'package:flutter/foundation.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/devices/comms_media_constraints.dart';

/// Per-share screen configuration.
@immutable
class ScreenShareConfig {
  /// One of `smooth`, `text`, `gaming`, `custom` (see [CommsMediaConstraints]).
  final String mode;

  /// Quality id for `custom` mode (`240p` … `1080p`).
  final String customQuality;

  /// Fps id for `custom` mode (`5` … `120`).
  final String customFps;

  /// Per-share max video bitrate in kbps. Null keeps the preset bitrate.
  final int? maxBitrateKbps;

  const ScreenShareConfig({
    this.mode = CommsMediaConstraints.defaultShareMode,
    this.customQuality = CommsMediaConstraints.defaultShareCustomQuality,
    this.customFps = CommsMediaConstraints.defaultShareCustomFps,
    this.maxBitrateKbps,
  });

  /// Defaults snapshot read from the settings map.
  factory ScreenShareConfig.fromSettings(Map<String, Object?> s) {
    final rawBitrate = s[CommsMediaConstraints.shareCustomBitrateKey];
    final bitrate = switch (rawBitrate) {
      final int v => v,
      final num v => v.toInt(),
      final String v => int.tryParse(v),
      _ => null,
    };
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
      maxBitrateKbps: bitrate,
    );
  }

  ScreenShareConfig copyWith({
    String? mode,
    String? customQuality,
    String? customFps,
    int? maxBitrateKbps,
  }) {
    return ScreenShareConfig(
      mode: mode ?? this.mode,
      customQuality: customQuality ?? this.customQuality,
      customFps: customFps ?? this.customFps,
      maxBitrateKbps: maxBitrateKbps ?? this.maxBitrateKbps,
    );
  }

  /// Effective quality id for this config, optionally clamped to source dimensions.
  String resolveEffectiveQuality({int? sourceWidth, int? sourceHeight}) {
    final preset = ScreenSharePreset.fromId(mode);
    final rawQuality = switch (preset) {
      ScreenSharePreset.custom =>
        CommsMediaConstraints.resolveVideoQuality(customQuality),
      _ => preset.quality,
    };
    if (preset != ScreenSharePreset.custom &&
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
    final preset = CommsMediaConstraints.shareParamsFor(quality, fps);
    final bitrate = maxBitrateKbps;
    if (bitrate == null) return preset;
    return VideoParameters(
      dimensions: preset.dimensions,
      encoding: VideoEncoding(maxBitrate: bitrate * 1000, maxFramerate: fps),
    );
  }

  double resolveMaxFrameRate() {
    final preset = ScreenSharePreset.fromId(mode);
    return switch (preset) {
      ScreenSharePreset.custom =>
        CommsMediaConstraints.resolveVideoFps('', customFps).toDouble(),
      _ => preset.fps.toDouble(),
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
      other.customFps == customFps &&
      other.maxBitrateKbps == maxBitrateKbps;

  @override
  int get hashCode =>
      Object.hash(mode, customQuality, customFps, maxBitrateKbps);
}
