import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/comms/comms_controller.dart';
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

Future<void> _persistAndApplyVideo(WidgetRef ref, String key, String value) async {
  await ref.read(settingsControllerProvider.notifier).set(key, value);
  await ref.read(commsProvider.notifier).applyVideoSettingsLive();
}

Future<void> saveVideoQualityOption(WidgetRef ref, String value) =>
    _persistAndApplyVideo(ref, CommsMediaConstraints.videoQualityKey, value);

Future<void> saveVideoFpsOption(WidgetRef ref, String value) =>
    _persistAndApplyVideo(ref, CommsMediaConstraints.videoFramerateKey, value);

Future<void> saveShareModeOption(WidgetRef ref, String value) => ref
    .read(settingsControllerProvider.notifier)
    .set(CommsMediaConstraints.shareModeKey, value);

Future<void> saveShareCustomQualityOption(WidgetRef ref, String value) => ref
    .read(settingsControllerProvider.notifier)
    .set(CommsMediaConstraints.shareCustomQualityKey, value);

Future<void> saveShareCustomFpsOption(WidgetRef ref, String value) => ref
    .read(settingsControllerProvider.notifier)
    .set(CommsMediaConstraints.shareCustomFpsKey, value);
