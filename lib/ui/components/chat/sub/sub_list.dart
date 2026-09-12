import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/chat/message_format.dart';
import 'package:novyse/core/chat/permissions.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/sub/create_sub_modal.dart';
import 'package:novyse/ui/components/chat/sub/vocal_sub_subtitle.dart';
import 'package:novyse/ui/components/huge_icon.dart';

const double kSubListCollapsedWidth = 70;
const double kSubListDefaultWidth = 250;
const double kSubListExpandThreshold = 150;
const double kSubListMinWidth = 70;
const double kSubListMaxWidth = 360;

/// Forum sub-channel list (collapsed initials on small screens, resizable column on wide).
class SubList extends ConsumerWidget {
  const SubList({
    super.key,
    required this.chat,
    required this.selectedSub,
    required this.isCollapsed,
    required this.width,
    this.topPadding = 0,
  });

  final ChatModel chat;
  final int selectedSub;
  final bool isCollapsed;
  final double width;
  final double topPadding;

  List<Map<String, dynamic>> _myRoles(ChatModel chat, String localUserUUID) {
    final myMember = chat.members
        .where((m) => m['uuid'] == localUserUUID)
        .firstOrNull;
    return chat.roles.where((r) => (myMember?['roleIDs'] as List).contains(r['id'])).toList();
  }

  String? _lastMessagePreview(
    Map<String, dynamic> sub,
    AppLocalizations l10n,
    String localUserUUID,
    Map<String, UserModel> users,
  ) {
    final last = sub['lastMessage'];
    if (last is! Map) return null;
    final formatted = formatMessage(
      Map<String, dynamic>.from(last),
      l10n: l10n,
      localUserUUID: localUserUUID,
      getUser: (uuid) => users[uuid]?.toMap(),
    );
    return formatted['content']?.toString();
  }

  Future<void> _onSubTap(
    WidgetRef ref,
    Map<String, dynamic> sub,
  ) async {
    final subId = sub['id'] as int;
    final type = sub['type'] as String;

    if (type == 'VOCAL') {
      final isJoined = ref
          .read(commsProvider)
          .isRoomMatch(chat.uuid, subId);
      if (!isJoined) {
        await ref.read(commsProvider.notifier).join(chat.uuid, sub: subId);
      }
    }

    ref.read(activeChatProvider.notifier).setSelectedSub(subId);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final localUserUUID = ref.watch(
      userStoreProvider.select((s) => s.localUserUUID),
    );
    final users = ref.watch(userStoreProvider.select((s) => s.users));
    final canManageSub = hasPermission(
      _myRoles(chat, localUserUUID),
      ChatPermissions.manageSub,
    );

    return Padding(
      padding: EdgeInsets.only(top: topPadding, left: 10, bottom: 10),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(25),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
          child: Container(
            width: width,
            decoration: BoxDecoration(
              color: colorScheme.surface.withValues(alpha: 0.55),
              borderRadius: BorderRadius.circular(25),
              border: Border.all(
                color: colorScheme.outline.withValues(alpha: 0.2),
              ),
            ),
            child: Stack(
              children: [
                ListView.separated(
                  padding: const EdgeInsets.all(10),
                  itemCount: chat.subs.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final sub = chat.subs[index];
                    final subId = sub['id'] as int;
                    final isActive = selectedSub == subId;
                    final name = (sub['name']?.toString().trim().isNotEmpty ==
                            true)
                        ? sub['name'].toString()
                        : 'Sub $subId';
                    final type = sub['type'] as String;
                    final preview = _lastMessagePreview(
                      sub,
                      l10n,
                      localUserUUID,
                      users,
                    );

                    final avatar = Container(
                      width: 45,
                      height: 45,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isActive
                            ? colorScheme.primary
                            : colorScheme.surfaceContainerHighest,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : '#',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: isActive
                              ? colorScheme.onPrimary
                              : colorScheme.onSurfaceVariant,
                        ),
                      ),
                    );

                    if (isCollapsed) {
                      return InkWell(
                        onTap: () => _onSubTap(ref, sub),
                        borderRadius: BorderRadius.circular(25),
                        child: Center(child: avatar),
                      );
                    }

                    return Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => _onSubTap(ref, sub),
                        borderRadius: BorderRadius.circular(16),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 4,
                          ),
                          child: Row(
                            children: [
                              avatar,
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: isActive
                                            ? FontWeight.w700
                                            : FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    if (type == 'VOCAL')
                                      VocalSubSubtitle(
                                        chatUUID: chat.uuid,
                                        subId: subId,
                                        defaultPreview: preview,
                                      )
                                    else if (preview != null &&
                                        preview.isNotEmpty)
                                      Text(
                                        preview,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: colorScheme.onSurfaceVariant,
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
                if (canManageSub)
                  Positioned(
                    right: isCollapsed ? 15 : 20,
                    bottom: 20,
                    child: FloatingActionButton.small(
                      heroTag: 'create-sub-${chat.uuid}',
                      onPressed: () =>
                          showCreateSubModal(context, chatUUID: chat.uuid),
                      child: const AppHugeIcon(
                        icon: HugeIcons.strokeRoundedAdd01,
                        size: 20,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Vertical drag handle used to resize the forum SubList column.
class SubListResizeHandle extends StatelessWidget {
  const SubListResizeHandle({
    super.key,
    required this.onDragUpdate,
  });

  final ValueChanged<double> onDragUpdate;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onHorizontalDragUpdate: (details) => onDragUpdate(details.delta.dx),
      child: MouseRegion(
        cursor: SystemMouseCursors.resizeColumn,
        child: SizedBox(
          width: 10,
          child: Center(
            child: Container(
              width: 3,
              height: 36,
              decoration: BoxDecoration(
                color: colorScheme.outline.withValues(alpha: 0.45),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
