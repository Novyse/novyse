import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/l10n/l10n.dart';

/// Centralized definition of all screen-share presets.
///
/// Each preset encapsulates its identifier, target resolution, frame rate,
/// recommended bitrate budgets, and display label.
enum ScreenSharePreset {
  smooth(
    id: 'smooth',
    quality: '1080p',
    fps: 60,
    defaultBitrateKbps: 4000,
    maxBitrateKbps: 10000,
    dimensions: VideoDimensionsPresets.h1080_169,
  ),
  text(
    id: 'text',
    quality: '1080p',
    fps: 5,
    defaultBitrateKbps: 1500,
    maxBitrateKbps: 4000,
    dimensions: VideoDimensionsPresets.h1080_169,
  ),
  gaming(
    id: 'gaming',
    quality: '720p',
    fps: 120,
    defaultBitrateKbps: 6000,
    maxBitrateKbps: 10000,
    dimensions: VideoDimensionsPresets.h720_169,
  ),
  custom(
    id: 'custom',
    quality: '1080p',
    fps: 60,
    defaultBitrateKbps: 4000,
    maxBitrateKbps: 10000,
    dimensions: VideoDimensionsPresets.h1080_169,
    isCustom: true,
  );

  final String id;
  final String quality;
  final int fps;
  final int defaultBitrateKbps;
  final int maxBitrateKbps;
  final VideoDimensions dimensions;
  final bool isCustom;

  const ScreenSharePreset({
    required this.id,
    required this.quality,
    required this.fps,
    required this.defaultBitrateKbps,
    required this.maxBitrateKbps,
    required this.dimensions,
    this.isCustom = false,
  });

  /// Factory resolving any raw or legacy mode string to a [ScreenSharePreset].
  static ScreenSharePreset fromId(String? id) => switch (id) {
    'smooth' || 'fluid_60' => ScreenSharePreset.smooth,
    'text' || 'clarity' => ScreenSharePreset.text,
    'gaming' => ScreenSharePreset.gaming,
    'custom' => ScreenSharePreset.custom,
    _ => ScreenSharePreset.smooth,
  };

  /// UI localized label.
  String label(AppLocalizations l) => switch (this) {
    ScreenSharePreset.smooth => l.settingsOptionShareQualitySmoothLabel,
    ScreenSharePreset.text => l.settingsOptionShareQualityTextLabel,
    ScreenSharePreset.gaming => l.settingsOptionShareQualityGamingLabel,
    ScreenSharePreset.custom => l.settingsOptionShareQualityCustomLabel,
  };

  /// Standard capture/publish parameters for this preset.
  VideoParameters get videoParameters => VideoParameters(
    dimensions: dimensions,
    encoding: VideoEncoding(
      maxBitrate: maxBitrateKbps * 1000,
      maxFramerate: fps,
    ),
  );

  /// All selectable preset IDs.
  static List<String> get ids =>
      ScreenSharePreset.values.map((p) => p.id).toList();
}
