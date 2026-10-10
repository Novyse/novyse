import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/devices/comms_bitrate_options.dart';
import 'package:novyse/core/comms/devices/comms_device.dart';
import 'package:novyse/core/comms/devices/comms_devices_controller.dart';
import 'package:novyse/core/comms/devices/comms_media_constraints.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/settings/settings_models.dart';

/// Lazy select loaders/savers for the comms device rows.
List<SettingOption> _withDefault(List<CommsDevice> devices) => [
  SettingOption(CommsDevicesDefaults.kDefaultId, (_) => 'Default'),
  for (final d in devices) SettingOption(d.id, (_) => d.label),
];

Future<List<SettingOption>> loadMicOptions(WidgetRef ref) async {
  await ref.read(commsDevicesProvider.notifier).refresh();
  return _withDefault(ref.read(commsDevicesProvider).audioInputs);
}

Future<void> saveMicOption(WidgetRef ref, String value) =>
    ref.read(commsProvider.notifier).setAudioInputDevice(value);

Future<List<SettingOption>> loadSpeakerOptions(WidgetRef ref) async {
  await ref.read(commsDevicesProvider.notifier).refresh();
  return _withDefault(ref.read(commsDevicesProvider).audioOutputs);
}

Future<void> saveSpeakerOption(WidgetRef ref, String value) =>
    ref.read(commsProvider.notifier).setAudioOutputDevice(value);

Future<List<SettingOption>> loadCameraOptions(WidgetRef ref) async {
  await ref.read(commsDevicesProvider.notifier).refresh();
  return _withDefault(ref.read(commsDevicesProvider).videoInputs);
}

Future<void> saveCameraOption(WidgetRef ref, String value) =>
    ref.read(commsProvider.notifier).setVideoInputDevice(value);

Future<void> saveVideoQualityOption(WidgetRef ref, String value) async {
  final fpsRaw =
      ref.read(settingsControllerProvider)[CommsMediaConstraints.videoFramerateKey];
  final fpsStr = fpsRaw is String ? fpsRaw : CommsMediaConstraints.defaultVideoFramerate;
  final fps = CommsMediaConstraints.resolveVideoFps(value, fpsStr);
  final adequateBitrate =
      CommsBitrateOptions.rangeFor(fps, quality: value).defaultKbps;

  await ref
      .read(settingsControllerProvider.notifier)
      .set(CommsMediaConstraints.videoQualityKey, value);
  await ref
      .read(settingsControllerProvider.notifier)
      .set(CommsMediaConstraints.videoBitrateKey, adequateBitrate);
  await ref.read(commsProvider.notifier).applyVideoSettingsLive();
}

Future<void> saveVideoFpsOption(WidgetRef ref, String value) async {
  final qualityRaw =
      ref.read(settingsControllerProvider)[CommsMediaConstraints.videoQualityKey];
  final qualityStr =
      qualityRaw is String ? qualityRaw : CommsMediaConstraints.defaultVideoQuality;
  final fps = CommsMediaConstraints.resolveVideoFps(qualityStr, value);
  final adequateBitrate =
      CommsBitrateOptions.rangeFor(fps, quality: qualityStr).defaultKbps;

  await ref
      .read(settingsControllerProvider.notifier)
      .set(CommsMediaConstraints.videoFramerateKey, value);
  await ref
      .read(settingsControllerProvider.notifier)
      .set(CommsMediaConstraints.videoBitrateKey, adequateBitrate);
  await ref.read(commsProvider.notifier).applyVideoSettingsLive();
}

Future<void> saveVideoBitrateOption(WidgetRef ref, String value) async {
  final intVal = int.tryParse(value);
  await ref
      .read(settingsControllerProvider.notifier)
      .set(CommsMediaConstraints.videoBitrateKey, intVal ?? value);
  await ref.read(commsProvider.notifier).applyVideoSettingsLive();
}

Future<void> saveShareModeOption(WidgetRef ref, String value) => ref
    .read(settingsControllerProvider.notifier)
    .set(CommsMediaConstraints.shareModeKey, value);

Future<void> saveShareCustomQualityOption(WidgetRef ref, String value) async {
  final fpsRaw =
      ref.read(settingsControllerProvider)[CommsMediaConstraints.shareCustomFpsKey];
  final fpsStr = fpsRaw is String ? fpsRaw : CommsMediaConstraints.defaultShareCustomFps;
  final fps = CommsMediaConstraints.resolveVideoFps('', fpsStr);
  final adequateBitrate =
      CommsBitrateOptions.rangeFor(fps, quality: value).defaultKbps;

  await ref
      .read(settingsControllerProvider.notifier)
      .set(CommsMediaConstraints.shareCustomQualityKey, value);
  await ref
      .read(settingsControllerProvider.notifier)
      .set(CommsMediaConstraints.shareCustomBitrateKey, adequateBitrate);
}

Future<void> saveShareCustomFpsOption(WidgetRef ref, String value) async {
  final qualityRaw =
      ref.read(settingsControllerProvider)[CommsMediaConstraints.shareCustomQualityKey];
  final qualityStr = qualityRaw is String
      ? qualityRaw
      : CommsMediaConstraints.defaultShareCustomQuality;
  final fps = CommsMediaConstraints.resolveVideoFps('', value);
  final adequateBitrate =
      CommsBitrateOptions.rangeFor(fps, quality: qualityStr).defaultKbps;

  await ref
      .read(settingsControllerProvider.notifier)
      .set(CommsMediaConstraints.shareCustomFpsKey, value);
  await ref
      .read(settingsControllerProvider.notifier)
      .set(CommsMediaConstraints.shareCustomBitrateKey, adequateBitrate);
}

Future<void> saveShareCustomBitrateOption(WidgetRef ref, String value) async {
  final intVal = int.tryParse(value);
  await ref
      .read(settingsControllerProvider.notifier)
      .set(CommsMediaConstraints.shareCustomBitrateKey, intVal ?? value);
}
