import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';

import 'overview_rows.dart';

class OverviewMembersList extends StatelessWidget {
  const OverviewMembersList({
    super.key,
    required this.chat,
    required this.users,
  });

  final ChatModel chat;
  final Map<String, UserModel> users;

  List<Map<String, dynamic>> _resolvedRoles(Map<String, dynamic> member) {
    final rawIds =
        member['roleIDs'] ?? member['role_ids'] ?? member['roleIds'] ?? [2];
    final ids = rawIds is List ? rawIds : [rawIds];
    return chat.roles.where((r) {
      return ids.any((id) => '$id' == '${r['id']}');
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    if (chat.members.isEmpty) {
      return OverviewEmptyState(
        icon: Icons.people_outline,
        text: l10n.overviewNoMembers,
      );
    }

    return Column(
      children: [
        for (var i = 0; i < chat.members.length; i++) ...[
          OverviewMemberRow(
            member: chat.members[i],
            users: users,
            roles: _resolvedRoles(chat.members[i]),
          ),
          if (i != chat.members.length - 1)
            Divider(
              height: 1,
              indent: 60,
              color: colorScheme.outline.withValues(alpha: 0.15),
            ),
        ],
      ],
    );
  }
}

class OverviewMemberRow extends StatelessWidget {
  const OverviewMemberRow({
    super.key,
    required this.member,
    required this.users,
    required this.roles,
  });

  final Map<String, dynamic> member;
  final Map<String, UserModel> users;
  final List<Map<String, dynamic>> roles;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final uuid = (member['uuid'] ?? member['userUUID'])?.toString();
    final user = uuid != null ? users[uuid] : null;
    final name = user?.displayName.trim().isNotEmpty == true
        ? user!.displayName.trim()
        : ((member['name'] ?? member['handle'] ?? l10n.chatUnknown)
              ?.toString());
    final isOnline =
        user?.isOnline ??
        (member['status']?.toString().toUpperCase() == 'ONLINE');
    final pfp =
        user?.profilePictureUUID ?? member['profilePictureUUID']?.toString();
    final joinedAt = DateTime.tryParse(member['joinedAt']?.toString() ?? '');

    return InkWell(
      onTap: () => _showMemberDialog(context, user, member),
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Avatar(
              uuid: pfp,
              name: name,
              seedKey: uuid ?? name,
              size: 44,
              isOnline: isOnline,
              type: 'USER',
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name ?? l10n.chatUnknown,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (roles.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        for (final role in roles)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Theme.of(context).colorScheme.primary
                                  .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              (role['name'] ?? 'Role').toString(),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            if (joinedAt != null)
              Text(
                DateFormat.yMMMMd().format(joinedAt.toLocal()),
                style: TextStyle(
                  fontSize: 11,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showMemberDialog(
    BuildContext context,
    UserModel? user,
    Map<String, dynamic> member,
  ) {
    final l10n = AppLocalizations.of(context)!;
    final uuid = (member['uuid'] ?? member['userUUID'])?.toString() ?? '';
    final name =
        user?.displayName ?? member['name']?.toString() ?? l10n.chatUnknown;
    final handle = user?.handle ?? member['handle']?.toString();
    final bio = user?.biography ?? member['biography']?.toString();
    ResponsiveOverlay.show<void>(
      context: context,
      title: name,
      subtitle: (handle != null && handle.isNotEmpty) ? '@$handle' : null,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Avatar(
            uuid: user?.profilePictureUUID,
            name: name,
            seedKey: uuid.isNotEmpty ? uuid : name,
            size: 64,
            isOnline: user?.isOnline == true,
            type: 'USER',
          ),
          const SizedBox(height: 12),
          if (bio != null && bio.trim().isNotEmpty)
            Text(bio.trim(), textAlign: TextAlign.center),
          const SizedBox(height: 20),
          AppButton(
            label: l10n.cancel,
            onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
          ),
        ],
      ),
    );
  }
}
