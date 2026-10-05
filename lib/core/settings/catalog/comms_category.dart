import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/devices/comms_setting_options.dart';
import 'package:novyse/core/settings/settings_models.dart';

/// Comms settings.
final List<SettingCategory> commsCategory = [
  SettingCategory(
    id: 'comms',
    title: (l) => l.settingsCategoryCommsTitle,
    subtitle: (l) => l.settingsCategoryCommsSubtitle,
    icon: HugeIcons.strokeRoundedMic01,
    pages: [
      SettingPage(
        id: 'comms_voice',
        title: (l) => l.settingsPageCommsVoiceTitle,
        subtitle: (l) => l.settingsPageCommsVoiceSubtitle,
        groups: [
          SettingGroup(
            id: 'voice',
            title: (l) => l.settingsGroupVoiceTitle,
            items: [
              SettingItem(
                id: 'input_device',
                title: (l) => l.settingsItemInputDeviceTitle,
                subtitle: (l) => l.settingsItemInputDeviceSubtitle,
                component: SettingComponent.select,
                settingKey: 'comms.inputDevice',
                scope: SettingScope.local,
                defaultValue: 'default',
                optionsLoader: loadMicOptions,
                onOptionPicked: saveMicOption,
              ),
              SettingItem(
                id: 'output_device',
                title: (l) => l.settingsItemOutputDeviceTitle,
                subtitle: (l) => l.settingsItemOutputDeviceSubtitle,
                component: SettingComponent.select,
                settingKey: 'comms.outputDevice',
                scope: SettingScope.local,
                defaultValue: 'default',
                optionsLoader: loadSpeakerOptions,
                onOptionPicked: saveSpeakerOption,
              ),
              SettingItem(
                id: 'mic_test',
                title: (l) => l.settingsItemMicTestTitle,
                subtitle: (l) => l.settingsItemMicTestSubtitle,
                component: SettingComponent.action,
                scope: SettingScope.local,
                actionId: 'micTest',
                disabled: true,
              ),
              SettingItem(
                id: 'input_mode',
                title: (l) => l.settingsItemInputModeTitle,
                subtitle: (l) => l.settingsItemInputModeSubtitle,
                component: SettingComponent.select,
                settingKey: 'comms.inputMode',
                scope: SettingScope.local,
                defaultValue: 'vad',
                options: [
                  SettingOption(
                    'vad',
                    (l) => l.settingsOptionInputModeVadLabel,
                  ),
                  SettingOption(
                    'ptt',
                    (l) => l.settingsOptionInputModePttLabel,
                  ),
                ],
                disabled: true,
              ),
              SettingItem(
                id: 'noise_suppression',
                title: (l) => l.settingsItemNoiseSuppressionTitle,
                subtitle: (l) => l.settingsItemNoiseSuppressionSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'comms.noiseSuppression',
                scope: SettingScope.local,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'expander',
                title: (l) => l.settingsItemExpanderTitle,
                subtitle: (l) => l.settingsItemExpanderSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'comms.expander',
                scope: SettingScope.local,
                defaultValue: false,
                disabled: true,
              ),
              SettingItem(
                id: 'noise_gate',
                title: (l) => l.settingsItemNoiseGateTitle,
                subtitle: (l) => l.settingsItemNoiseGateSubtitle,
                component: SettingComponent.slider,
                settingKey: 'comms.noiseGateDb',
                scope: SettingScope.local,
                defaultValue: -42,
                min: -60,
                max: 0,
                disabled: true,
              ),
              SettingItem(
                id: 'keystroke_attenuation',
                title: (l) => l.settingsItemKeystrokeAttenuationTitle,
                subtitle: (l) => l.settingsItemKeystrokeAttenuationSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'comms.keystrokeAttenuation',
                scope: SettingScope.local,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'echo_cancellation',
                title: (l) => l.settingsItemEchoCancellationTitle,
                subtitle: (l) => l.settingsItemEchoCancellationSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'comms.echoCancellation',
                scope: SettingScope.local,
                defaultValue: true,
                disabled: true,
              ),
            ],
          ),
        ],
      ),
      SettingPage(
        id: 'comms_video',
        title: (l) => l.settingsPageCommsVideoTitle,
        subtitle: (l) => l.settingsPageCommsVideoSubtitle,
        groups: [
          SettingGroup(
            id: 'video',
            title: (l) => l.settingsGroupVideoTitle,
            items: [
              SettingItem(
                id: 'webcam',
                title: (l) => l.settingsItemWebcamTitle,
                subtitle: (l) => l.settingsItemWebcamSubtitle,
                component: SettingComponent.select,
                settingKey: 'comms.webcam',
                scope: SettingScope.local,
                defaultValue: 'default',
                optionsLoader: loadCameraOptions,
                onOptionPicked: saveCameraOption,
              ),
              SettingItem(
                id: 'video_quality',
                title: (l) => l.settingsItemVideoQualityTitle,
                subtitle: (l) => l.settingsItemVideoQualitySubtitle,
                component: SettingComponent.select,
                settingKey: 'comms.videoQuality',
                scope: SettingScope.local,
                defaultValue: '1080p',
                options: [
                  SettingOption(
                    '720p',
                    (l) => l.settingsOptionVideoQuality720pLabel,
                  ),
                  SettingOption(
                    '1080p',
                    (l) => l.settingsOptionVideoQuality1080pLabel,
                  ),
                  SettingOption(
                    '4k',
                    (l) => l.settingsOptionVideoQuality4kLabel,
                  ),
                ],
                disabled: true,
              ),
              SettingItem(
                id: 'video_fps',
                title: (l) => l.settingsItemVideoFpsTitle,
                subtitle: (l) => l.settingsItemVideoFpsSubtitle,
                component: SettingComponent.select,
                settingKey: 'comms.videoFramerate',
                scope: SettingScope.local,
                defaultValue: '30',
                options: [
                  SettingOption('30', (l) => l.settingsOptionVideoFps30Label),
                  SettingOption('60', (l) => l.settingsOptionVideoFps60Label),
                ],
                disabled: true,
              ),
              SettingItem(
                id: 'virtual_bg',
                title: (l) => l.settingsItemVirtualBgTitle,
                subtitle: (l) => l.settingsItemVirtualBgSubtitle,
                component: SettingComponent.select,
                settingKey: 'comms.virtualBackground',
                scope: SettingScope.local,
                defaultValue: 'none',
                options: [
                  SettingOption(
                    'none',
                    (l) => l.settingsOptionVirtualBgNoneLabel,
                  ),
                  SettingOption(
                    'light_blur',
                    (l) => l.settingsOptionVirtualBgLightBlurLabel,
                  ),
                  SettingOption(
                    'heavy_blur',
                    (l) => l.settingsOptionVirtualBgHeavyBlurLabel,
                  ),
                  SettingOption(
                    'custom',
                    (l) => l.settingsOptionVirtualBgCustomLabel,
                  ),
                ],
                disabled: true,
              ),
            ],
          ),
        ],
      ),
      SettingPage(
        id: 'comms_screenshare',
        title: (l) => l.settingsPageCommsScreenshareTitle,
        subtitle: (l) => l.settingsPageCommsScreenshareSubtitle,
        groups: [
          SettingGroup(
            id: 'screenshare',
            title: (l) => l.settingsGroupScreenshareTitle,
            items: [
              SettingItem(
                id: 'share_quality',
                title: (l) => l.settingsItemShareQualityTitle,
                subtitle: (l) => l.settingsItemShareQualitySubtitle,
                component: SettingComponent.select,
                settingKey: 'comms.shareQuality',
                scope: SettingScope.local,
                defaultValue: 'clarity',
                options: [
                  SettingOption(
                    'fluid_60',
                    (l) => l.settingsOptionShareQualityFluid60Label,
                  ),
                  SettingOption(
                    'clarity',
                    (l) => l.settingsOptionShareQualityClarityLabel,
                  ),
                ],
                disabled: true,
              ),
              SettingItem(
                id: 'hifi_audio',
                title: (l) => l.settingsItemHifiAudioTitle,
                subtitle: (l) => l.settingsItemHifiAudioSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'comms.hifiAudioPassthrough',
                scope: SettingScope.local,
                defaultValue: false,
                disabled: true,
              ),
            ],
          ),
        ],
      ),
      SettingPage(
        id: 'comms_sounds',
        title: (l) => l.settingsPageCommsSoundsTitle,
        subtitle: (l) => l.settingsPageCommsSoundsSubtitle,
        groups: [
          SettingGroup(
            id: 'comms_sound_items',
            title: (l) => l.settingsGroupCommsSoundItemsTitle,
            items: [
              SettingItem(
                id: 'soundboard',
                title: (l) => l.settingsItemSoundboardTitle,
                subtitle: (l) => l.settingsItemSoundboardSubtitle,
                component: SettingComponent.custom,
                settingKey: 'comms.soundboard',
                scope: SettingScope.local,
                defaultValue: '{}',
                customRendererId: 'soundboard',
                disabled: true,
              ),
            ],
          ),
        ],
      ),
      SettingPage(
        id: 'comms_volumes',
        title: (l) => l.settingsPageCommsVolumesTitle,
        subtitle: (l) => l.settingsPageCommsVolumesSubtitle,
        groups: [
          SettingGroup(
            id: 'volumes',
            title: (l) => l.settingsGroupVolumesTitle,
            items: [
              SettingItem(
                id: 'volumes_list',
                title: (l) => l.settingsItemVolumesListTitle,
                subtitle: (l) => l.settingsItemVolumesListSubtitle,
                component: SettingComponent.custom,
                settingKey: 'comms.remoteVolumes',
                scope: SettingScope.local,
                defaultValue: const {},
                hidden: true,
              ),
            ],
          ),
        ],
      ),
    ],
  ),
];
