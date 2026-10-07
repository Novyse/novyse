import 'package:novyse/core/comms/devices/comms_media_constraints.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_models.dart';

/// Single source of truth for media quality selectable values.
///
/// Video (camera) and screenshare differ in shape:
/// - video = plain quality + fps;
/// - screenshare = mode (`fluid_60` / `clarity` / `custom`) + conditional
///   custom quality + fps.
///
abstract final class CommsQualityOptions {

  /// Camera quality ids, low to high. `4k` is visible but disabled.
  static const List<String> videoQualities = [
    CommsMediaConstraints.video480p,
    CommsMediaConstraints.video720p,
    CommsMediaConstraints.video1080p,
    CommsMediaConstraints.video2k,
    CommsMediaConstraints.video4k,
  ];

  /// Disabled video quality ids.
  static const Set<String> disabledVideoQualities = {
    CommsMediaConstraints.video4k,
  };

  /// Fps ids shared by video and custom share mode.
  static const List<String> fpsValues = [
    CommsMediaConstraints.fps5,
    CommsMediaConstraints.fps15,
    CommsMediaConstraints.fps24,
    CommsMediaConstraints.fps30,
    CommsMediaConstraints.fps60,
    CommsMediaConstraints.fps120,
  ];

  /// Screenshare mode ids.
  static const List<String> shareModes = [
    CommsMediaConstraints.shareFluid,
    CommsMediaConstraints.shareClarity,
    CommsMediaConstraints.shareCustom,
  ];

  /// Custom share quality ids (480p to 4k, `4k` disabled).
  static const List<String> shareCustomQualities = [
    CommsMediaConstraints.video480p,
    CommsMediaConstraints.video720p,
    CommsMediaConstraints.video1080p,
    CommsMediaConstraints.video2k,
    CommsMediaConstraints.video4k,
  ];

  /// Disabled custom share quality ids.
  static const Set<String> disabledShareCustomQualities = {
    CommsMediaConstraints.video4k,
  };

  static String qualityLabel(AppLocalizations l, String id) {
    return switch (id) {
      CommsMediaConstraints.video480p => l.settingsOptionVideoQuality480pLabel,
      CommsMediaConstraints.video720p => l.settingsOptionVideoQuality720pLabel,
      CommsMediaConstraints.video1080p =>
        l.settingsOptionVideoQuality1080pLabel,
      CommsMediaConstraints.video2k => l.settingsOptionVideoQuality2kLabel,
      CommsMediaConstraints.video4k => l.settingsOptionVideoQuality4kLabel,
      _ => id,
    };
  }

  static String fpsLabel(AppLocalizations l, String id) {
    return switch (id) {
      CommsMediaConstraints.fps5 => l.settingsOptionVideoFps5Label,
      CommsMediaConstraints.fps15 => l.settingsOptionVideoFps15Label,
      CommsMediaConstraints.fps24 => l.settingsOptionVideoFps24Label,
      CommsMediaConstraints.fps30 => l.settingsOptionVideoFps30Label,
      CommsMediaConstraints.fps60 => l.settingsOptionVideoFps60Label,
      CommsMediaConstraints.fps120 => l.settingsOptionVideoFps120Label,
      _ => id,
    };
  }

  static String shareModeLabel(AppLocalizations l, String id) {
    return switch (id) {
      CommsMediaConstraints.shareFluid =>
        l.settingsOptionShareQualityFluid60Label,
      CommsMediaConstraints.shareClarity =>
        l.settingsOptionShareQualityClarityLabel,
      CommsMediaConstraints.shareCustom =>
        l.settingsOptionShareQualityCustomLabel,
      _ => id,
    };
  }

  static List<SettingOption> videoQualityOptions() => [
    for (final id in videoQualities)
      SettingOption(
        id,
        (l) => qualityLabel(l, id),
        disabled: disabledVideoQualities.contains(id),
      ),
  ];

  static List<SettingOption> fpsOptions() => [
    for (final id in fpsValues) SettingOption(id, (l) => fpsLabel(l, id)),
  ];

  static List<SettingOption> shareModeOptions() => [
    for (final id in shareModes)
      SettingOption(id, (l) => shareModeLabel(l, id)),
  ];

  static List<SettingOption> shareCustomQualityOptions() => [
    for (final id in shareCustomQualities)
      SettingOption(
        id,
        (l) => qualityLabel(l, id),
        disabled: disabledShareCustomQualities.contains(id),
      ),
  ];
}
