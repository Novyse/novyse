import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/settings/settings_models.dart';

/// Notifications settings.
final List<SettingCategory> notificationsCategory = [
  SettingCategory(
    id: 'notifications',
    title: (l) => l.settingsCategoryNotificationsTitle,
    subtitle: (l) => l.settingsCategoryNotificationsSubtitle,
    icon: HugeIcons.strokeRoundedNotification01,
    pages: [
      SettingPage(
        id: 'notifications_chats',
        title: (l) => l.settingsPageNotificationsChatsTitle,
        subtitle: (l) => l.settingsPageNotificationsChatsSubtitle,
        groups: [
          SettingGroup(
            id: 'chat_notifications',
            title: (l) => l.settingsGroupChatNotificationsTitle,
            items: [
              SettingItem(
                id: 'private_chats',
                title: (l) => l.settingsItemPrivateChatsTitle,
                subtitle: (l) => l.settingsItemPrivateChatsSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'notifications.privateChats',
                scope: SettingScope.synchronized,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'groups_mode',
                title: (l) => l.settingsItemGroupsModeTitle,
                subtitle: (l) => l.settingsItemGroupsModeSubtitle,
                component: SettingComponent.select,
                settingKey: 'notifications.groups',
                scope: SettingScope.synchronized,
                defaultValue: 'mentions',
                options: [
                  SettingOption(
                    'all',
                    (l) => l.settingsOptionGroupsModeAllLabel,
                  ),
                  SettingOption(
                    'mentions',
                    (l) => l.settingsOptionGroupsModeMentionsLabel,
                  ),
                  SettingOption(
                    'muted',
                    (l) => l.settingsOptionGroupsModeMutedLabel,
                  ),
                ],
                disabled: true,
              ),
              SettingItem(
                id: 'channels_notif',
                title: (l) => l.settingsItemChannelsNotifTitle,
                subtitle: (l) => l.settingsItemChannelsNotifSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'notifications.channels',
                scope: SettingScope.synchronized,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'forums_notif',
                title: (l) => l.settingsItemForumsNotifTitle,
                subtitle: (l) => l.settingsItemForumsNotifSubtitle,
                component: SettingComponent.select,
                settingKey: 'notifications.forums',
                scope: SettingScope.synchronized,
                defaultValue: 'subscribed',
                options: [
                  SettingOption(
                    'all',
                    (l) => l.settingsOptionForumsNotifAllLabel,
                  ),
                  SettingOption(
                    'subscribed',
                    (l) => l.settingsOptionForumsNotifSubscribedLabel,
                  ),
                  SettingOption(
                    'muted',
                    (l) => l.settingsOptionForumsNotifMutedLabel,
                  ),
                ],
                disabled: true,
              ),
            ],
          ),
        ],
      ),
      SettingPage(
        id: 'notifications_calls',
        title: (l) => l.settingsPageNotificationsCallsTitle,
        subtitle: (l) => l.settingsPageNotificationsCallsSubtitle,
        groups: [
          SettingGroup(
            id: 'calls',
            title: (l) => l.settingsGroupCallsTitle,
            items: [
              SettingItem(
                id: 'ringtone',
                title: (l) => l.settingsItemRingtoneTitle,
                subtitle: (l) => l.settingsItemRingtoneSubtitle,
                component: SettingComponent.custom,
                settingKey: 'notifications.ringtone',
                scope: SettingScope.local,
                defaultValue: 'default',
                customRendererId: 'ringtonePicker',
                disabled: true,
              ),
              SettingItem(
                id: 'vibration',
                title: (l) => l.settingsItemVibrationTitle,
                subtitle: (l) => l.settingsItemVibrationSubtitle,
                component: SettingComponent.select,
                settingKey: 'notifications.callVibration',
                scope: SettingScope.local,
                defaultValue: 'heartbeat',
                options: [
                  SettingOption(
                    'continuous',
                    (l) => l.settingsOptionVibrationContinuousLabel,
                  ),
                  SettingOption(
                    'heartbeat',
                    (l) => l.settingsOptionVibrationHeartbeatLabel,
                  ),
                  SettingOption(
                    'pulse',
                    (l) => l.settingsOptionVibrationPulseLabel,
                  ),
                  SettingOption(
                    'silent',
                    (l) => l.settingsOptionVibrationSilentLabel,
                  ),
                ],
                disabled: true,
              ),
            ],
          ),
        ],
      ),
      SettingPage(
        id: 'notifications_inapp',
        title: (l) => l.settingsPageNotificationsInappTitle,
        subtitle: (l) => l.settingsPageNotificationsInappSubtitle,
        groups: [
          SettingGroup(
            id: 'inapp',
            title: (l) => l.settingsGroupInappTitle,
            items: [
              SettingItem(
                id: 'inapp_sounds',
                title: (l) => l.settingsItemInappSoundsTitle,
                subtitle: (l) => l.settingsItemInappSoundsSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'notifications.inAppSounds',
                scope: SettingScope.local,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'inapp_vibrate',
                title: (l) => l.settingsItemInappVibrateTitle,
                subtitle: (l) => l.settingsItemInappVibrateSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'notifications.inAppVibrate',
                scope: SettingScope.local,
                defaultValue: false,
                disabled: true,
              ),
              SettingItem(
                id: 'inapp_preview',
                title: (l) => l.settingsItemInappPreviewTitle,
                subtitle: (l) => l.settingsItemInappPreviewSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'notifications.inAppPreview',
                scope: SettingScope.local,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'inapp_effects',
                title: (l) => l.settingsItemInappEffectsTitle,
                subtitle: (l) => l.settingsItemInappEffectsSubtitle,
                component: SettingComponent.switchToggle,
                settingKey: 'notifications.inChatEffects',
                scope: SettingScope.local,
                defaultValue: true,
                disabled: true,
              ),
              SettingItem(
                id: 'badge_rules',
                title: (l) => l.settingsItemBadgeRulesTitle,
                subtitle: (l) => l.settingsItemBadgeRulesSubtitle,
                component: SettingComponent.select,
                settingKey: 'notifications.badgeRules',
                scope: SettingScope.local,
                defaultValue: 'unread_messages',
                options: [
                  SettingOption(
                    'unread_messages',
                    (l) => l.settingsOptionBadgeRulesUnreadMessagesLabel,
                  ),
                  SettingOption(
                    'unread_chats',
                    (l) => l.settingsOptionBadgeRulesUnreadChatsLabel,
                  ),
                  SettingOption(
                    'exclude_muted',
                    (l) => l.settingsOptionBadgeRulesExcludeMutedLabel,
                  ),
                ],
                disabled: true,
              ),
            ],
          ),
        ],
      ),
    ],
  ),
];
