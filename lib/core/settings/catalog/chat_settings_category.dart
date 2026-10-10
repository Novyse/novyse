import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/settings/settings_models.dart';

/// Chat Settings settings.
final List<SettingCategory> chatSettingsCategory = [
  SettingCategory(
    id: 'chat',
    title: (l) => l.settingsCategoryChatTitle,
    subtitle: (l) => l.settingsCategoryChatSubtitle,
    icon: HugeIcons.strokeRoundedChat01,
    pages: [
      SettingPage(
        id: 'chat_media',
        title: (l) => l.settingsPageChatMediaTitle,
        subtitle: (l) => l.settingsPageChatMediaSubtitle,
        groups: [
          SettingGroup(
            id: 'media_sounds',
            title: (l) => l.settingsGroupMediaSoundsTitle,
            items: [
              SettingItem(
                id: 'pause_music_recording',
                title: (l) => l.settingsItemPauseMusicRecordingTitle,
                subtitle: (l) => l.settingsItemPauseMusicRecordingSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'chat.pauseMusicWhileRecording',
                scope: SettingScope.local,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'pause_music_playing',
                title: (l) => l.settingsItemPauseMusicPlayingTitle,
                subtitle: (l) => l.settingsItemPauseMusicPlayingSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'chat.pauseMusicWhilePlaying',
                scope: SettingScope.local,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'autoplay_gifs',
                title: (l) => l.settingsItemAutoplayGifsTitle,
                subtitle: (l) => l.settingsItemAutoplayGifsSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'chat.autoplayGifsAndVideos',
                scope: SettingScope.local,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'ear_speaker',
                title: (l) => l.settingsItemEarSpeakerTitle,
                subtitle: (l) => l.settingsItemEarSpeakerSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'chat.earSpeakerMode',
                scope: SettingScope.local,
                defaultValue: false,
                disabled: true,
              ),
            ],
          ),
        ],
      ),
      SettingPage(
        id: 'chat_input',
        title: (l) => l.settingsPageChatInputTitle,
        subtitle: (l) => l.settingsPageChatInputSubtitle,
        groups: [
          SettingGroup(
            id: 'input_formatting',
            title: (l) => l.settingsGroupInputFormattingTitle,
            items: [
              SettingItem(
                id: 'send_with_enter',
                title: (l) => l.settingsItemSendWithEnterTitle,
                subtitle: (l) => l.settingsItemSendWithEnterSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'chat.sendWithEnter',
                scope: SettingScope.local,
                defaultValue: true,
                disabled: false,
              ),
              SettingItem(
                id: 'markdown_toolbar',
                title: (l) => l.settingsItemMarkdownToolbarTitle,
                subtitle: (l) => l.settingsItemMarkdownToolbarSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'chat.markdownToolbar',
                scope: SettingScope.synchronized,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'smart_emoji',
                title: (l) => l.settingsItemSmartEmojiTitle,
                subtitle: (l) => l.settingsItemSmartEmojiSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'chat.smartEmojiSuggestions',
                scope: SettingScope.synchronized,
                defaultValue: true,
                disabled: true,
              ),
            ],
          ),
        ],
      ),
    ],
  ),
];
