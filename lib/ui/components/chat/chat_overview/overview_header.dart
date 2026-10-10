import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';
import 'package:novyse/ui/components/settings/settings_value_row.dart';

class OverviewHeaderBlock extends StatelessWidget {
  const OverviewHeaderBlock({
    super.key,
    required this.chat,
    required this.metadata,
    required this.isDM,
    required this.localUserUUID,
    required this.users,
  });

  final ChatModel chat;
  final ResolvedChatMetadata metadata;
  final bool isDM;
  final String localUserUUID;
  final Map<String, UserModel> users;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final subtitle = isDM
        ? (metadata.isSavedMessages
              ? ''
              : (metadata.isOnline ? l10n.online : l10n.offline))
        : l10n.membersCount(chat.members.length);

    return Column(
      children: [
        Avatar(
          uuid: metadata.profilePictureUUID,
          name: metadata.name,
          seedKey: chat.uuid,
          size: 104,
          isOnline: metadata.isOnline,
          isSavedMessages: metadata.isSavedMessages,
          type: chat.type,
        ),
        const SizedBox(height: 12),
        Text(
          metadata.name,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
        ),
        if (subtitle.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 13,
              color: isDM && metadata.isOnline && !metadata.isSavedMessages
                  ? colorScheme.primary
                  : colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        const SizedBox(height: 16),
      ],
    );
  }
}

class OverviewDmInfoCard extends StatelessWidget {
  const OverviewDmInfoCard({
    super.key,
    required this.chat,
    required this.metadata,
    required this.localUserUUID,
    required this.users,
  });

  final ChatModel chat;
  final ResolvedChatMetadata metadata;
  final String localUserUUID;
  final Map<String, UserModel> users;

  UserModel? _dmUser() {
    if (metadata.otherUserUUID != null) return users[metadata.otherUserUUID];
    for (final m in chat.members) {
      final uuid = (m['uuid'] ?? m['userUUID'])?.toString();
      if (uuid != null && uuid != localUserUUID) {
        final user = users[uuid];
        if (user != null) return user;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final dmUser = _dmUser();
    if (dmUser == null && metadata.isSavedMessages) {
      return const SizedBox.shrink();
    }
    final handle = dmUser?.handle;
    final bio = dmUser?.biography;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: SettingsSection(
        children: [
          SettingsValueRow(
            icon: HugeIcons.strokeRoundedUser,
            title: l10n.overviewUsername,
            valueText: handle != null && handle.isNotEmpty
                ? '@$handle'
                : l10n.overviewNotSpecified,
          ),
          SettingsValueRow(
            icon: HugeIcons.strokeRoundedInformationCircle,
            title: l10n.overviewBiography,
            subtitle: bio != null && bio.trim().isNotEmpty
                ? bio.trim()
                : l10n.overviewNoDescription,
          ),
        ],
      ),
    );
  }
}
