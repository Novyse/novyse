import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/chat/message_action_methods.dart';
import 'package:novyse/core/chat/permissions.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class MessageActionMenuItem {
  final String label;
  final List<List<dynamic>> icon;
  final VoidCallback onTap;
  final bool isDanger;

  const MessageActionMenuItem({
    required this.label,
    required this.icon,
    required this.onTap,
    this.isDanger = false,
  });
}

class MessageActionMenu extends ConsumerWidget {
  const MessageActionMenu({
    super.key,
    required this.position,
    required this.message,
    this.selectedText,
  });

  final Offset position;
  final MessageModel message;
  final String? selectedText;

  static const double menuWidth = 190.0;
  static const double edgePadding = 10.0;
  static const double itemHeight = 40.0;

  static Future<void> show({
    required BuildContext context,
    required Offset position,
    required MessageModel message,
    String? selectedText,
  }) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'DismissContextOverlay',
      barrierColor: Colors.black.withValues(alpha: 0.15),
      transitionDuration: const Duration(milliseconds: 150),
      pageBuilder: (dialogContext, animation, secondaryAnimation) {
        return FadeTransition(
          opacity: animation,
          child: MessageActionMenu(
            position: position,
            message: message,
            selectedText: selectedText,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final methods = MessageActionMethods(
      ref: ref,
      context: context,
      chatUUID: message.chatUUID,
      subID: message.subID,
    );
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final screenSize = MediaQuery.sizeOf(context);

    final hasSelectedText =
        selectedText != null && selectedText!.trim().isNotEmpty;
    final hasFiles = message.files.isNotEmpty;

    final localUserUUID =
        ref.watch(userStoreProvider.select((s) => s.localUserUUID));
    final chat = ref.watch(chatProvider(message.chatUUID));

    final isMine = message.userUUID == localUserUUID;
    final isPinned = message.pinned;
    final isDM = chat?.type == 'DM';

    final sub = chat?.subs.where((s) => s['id'] == message.subID).firstOrNull;
    final subType = sub?['type'] as String?;

    final myMember = chat?.members
        .where((m) => m['uuid'] == localUserUUID)
        .firstOrNull;
    final myRoleIDs = (myMember?['roleIDs'] as List?) ?? const [];
    final myRoles = (chat?.roles ?? [])
        .where((r) => myRoleIDs.contains(r['id']))
        .toList();
    final myLevel = getEffectiveLevel(myRoles);

    final canReply = isDM ||
        chat == null ||
        hasPermission(myRoles, ChatPermissions.sendMessage, subType);
    final canQuoteAndReply = canReply && hasSelectedText;
    final canPin = isDM ||
        chat == null ||
        hasPermission(myRoles, ChatPermissions.pinMessage);
    final canEdit = isMine && canReply;

    bool canDelete = isMine;
    if (!canDelete && !isDM && chat != null) {
      final targetMember = chat.members
          .where((m) => m['uuid'] == message.userUUID)
          .firstOrNull;
      final targetRoleIDs = (targetMember?['roleIDs'] as List?) ?? const [];
      final targetRoles = chat.roles
          .where((r) => targetRoleIDs.contains(r['id']))
          .toList();
      final targetLevel = getEffectiveLevel(targetRoles);
      canDelete = hasPermission(myRoles, ChatPermissions.deleteMessage) &&
          myLevel >= targetLevel;
    }

    final items = <MessageActionMenuItem>[
      // Reply
      if (canReply)
        MessageActionMenuItem(
          label: l10n.reply,
          icon: HugeIcons.strokeRoundedArrowMoveUpLeft,
          onTap: () {
            Navigator.of(context).pop();
            methods.reply(message);
          },
        ),

      // Quote and Reply (if text selected and reply allowed)
      if (canQuoteAndReply)
        MessageActionMenuItem(
          label: l10n.quoteAndReply,
          icon: HugeIcons.strokeRoundedArrowMoveUpLeft,
          onTap: () {
            final text = selectedText!;
            Navigator.of(context).pop();
            methods.quoteAndReply(message, text);
          },
        ),

      // Pin / Unpin
      if (canPin)
        MessageActionMenuItem(
          label: isPinned ? l10n.unpin : l10n.pin,
          icon: isPinned
              ? HugeIcons.strokeRoundedPinOff
              : HugeIcons.strokeRoundedPin,
          onTap: () {
            Navigator.of(context).pop();
            methods.pin(message);
          },
        ),

      // Copy
      MessageActionMenuItem(
        label: l10n.copy,
        icon: HugeIcons.strokeRoundedCopy01,
        onTap: () {
          Navigator.of(context).pop();
          methods.copy(message);
        },
      ),

      // Copy Selected (if text selected)
      if (hasSelectedText)
        MessageActionMenuItem(
          label: l10n.copySelected,
          icon: HugeIcons.strokeRoundedCopy01,
          onTap: () {
            final text = selectedText!;
            Navigator.of(context).pop();
            methods.copySelected(text);
          },
        ),

      // Download (if files present)
      if (hasFiles)
        MessageActionMenuItem(
          label: l10n.download,
          icon: HugeIcons.strokeRoundedDownload01,
          onTap: () {
            Navigator.of(context).pop();
            methods.download(message);
          },
        ),

      // Edit (if sender and can reply)
      if (canEdit)
        MessageActionMenuItem(
          label: l10n.edit,
          icon: HugeIcons.strokeRoundedEdit02,
          onTap: () {
            Navigator.of(context).pop();
            methods.edit(message);
          },
        ),

      // Forward
      MessageActionMenuItem(
        label: l10n.forward,
        icon: HugeIcons.strokeRoundedLinkForward,
        onTap: () {
          Navigator.of(context).pop();
          methods.forward(message);
        },
      ),

      // Select
      MessageActionMenuItem(
        label: l10n.select,
        icon: HugeIcons.strokeRoundedCheckmarkCircle02,
        onTap: () {
          Navigator.of(context).pop();
          methods.select(message);
        },
      ),

      // Delete (author or admin with deleteMessage & higher/equal role level)
      if (canDelete)
        MessageActionMenuItem(
          label: l10n.delete,
          icon: HugeIcons.strokeRoundedDelete02,
          isDanger: true,
          onTap: () {
            Navigator.of(context).pop();
            methods.delete(message);
          },
        ),
    ];

    final estimatedHeight = items.length * itemHeight + 16.0;

    // Position clamping
    double x = position.dx;
    double y = position.dy;

    if (x + menuWidth > screenSize.width - edgePadding) {
      x = screenSize.width - menuWidth - edgePadding;
    }
    if (x < edgePadding) {
      x = edgePadding;
    }

    if (y + estimatedHeight > screenSize.height - edgePadding) {
      y = y - estimatedHeight;
      if (y < edgePadding) {
        y = edgePadding;
      }
    }

    return Stack(
      children: [
        // Barrier dismiss listener
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => Navigator.of(context).pop(),
            onSecondaryTap: () => Navigator.of(context).pop(),
            child: const SizedBox.expand(),
          ),
        ),

        // Positioned Menu Card
        Positioned(
          left: x,
          top: y,
          child: Material(
            color: Colors.transparent,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: Container(
                  width: menuWidth,
                  padding: const EdgeInsets.symmetric(
                    vertical: 6,
                    horizontal: 5,
                  ),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest.withValues(
                      alpha: 0.88,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: colorScheme.outlineVariant.withValues(alpha: 0.35),
                      width: 1,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: items.map((item) {
                      final itemColor = item.isDanger
                          ? colorScheme.error
                          : colorScheme.onSurface;

                      return InkWell(
                        onTap: item.onTap,
                        borderRadius: BorderRadius.circular(14),
                        hoverColor: item.isDanger
                            ? colorScheme.error.withValues(alpha: 0.1)
                            : colorScheme.surfaceContainerHigh.withValues(
                                alpha: 0.5,
                              ),
                        splashColor: item.isDanger
                            ? colorScheme.error.withValues(alpha: 0.2)
                            : colorScheme.primary.withValues(alpha: 0.15),
                        child: Container(
                          height: itemHeight,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          child: Row(
                            children: [
                              AppHugeIcon(
                                icon: item.icon,
                                size: 18,
                                color: itemColor,
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  item.label,
                                  style: TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w500,
                                    color: itemColor,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
