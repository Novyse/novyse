import 'dart:math' as math;
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
import 'package:novyse/ui/components/chat/message/action_menu/reaction_menu.dart';
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

class MessageActionMenu extends ConsumerStatefulWidget {
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
  ConsumerState<MessageActionMenu> createState() => _MessageActionMenuState();
}

class _MessageActionMenuState extends ConsumerState<MessageActionMenu> {
  bool _isReactionExpanded = false;

  Widget _buildStatPill({
    required BuildContext context,
    required List<List<dynamic>> icon,
    required String text,
  }) {
    final colorScheme = Theme.of(context).colorScheme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.88),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: colorScheme.outlineVariant.withValues(alpha: 0.35),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AppHugeIcon(
                icon: icon,
                size: 16,
                color: colorScheme.onSurface,
              ),
              const SizedBox(width: 6),
              Text(
                text,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final message = widget.message;
    final position = widget.position;
    final selectedText = widget.selectedText;

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
        selectedText != null && selectedText.trim().isNotEmpty;
    final hasFiles = message.files.isNotEmpty;

    final localUserUUID = ref.watch(
      userStoreProvider.select((s) => s.localUserUUID),
    );
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

    final canReply =
        isDM ||
        chat == null ||
        hasPermission(myRoles, ChatPermissions.sendMessage, subType);
    final canQuoteAndReply = canReply && hasSelectedText;
    final canPin =
        isDM ||
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
      canDelete =
          hasPermission(myRoles, ChatPermissions.deleteMessage) &&
          myLevel >= targetLevel;
    }

    final isSystem = message.isSystem;

    final items = isSystem
        ? <MessageActionMenuItem>[]
        : <MessageActionMenuItem>[
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
                  final text = selectedText;
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
                  final text = selectedText;
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

    // Stats calculations
    final reads = message.reads;
    final readCount = reads.length;
    final hasRead = readCount > 0;

    final reactions = message.reactions;
    final totalReactions = reactions.fold<int>(
      0,
      (acc, r) => acc + ((r['userUUIDs'] as List?)?.length ?? 0),
    );
    final hasReactions = totalReactions > 0;
    final showStats = !message.isPending && ((isMine && hasRead) || hasReactions);

    const menuWidth = MessageActionMenu.menuWidth;
    const edgePadding = MessageActionMenu.edgePadding;
    const itemHeight = MessageActionMenu.itemHeight;

    const reactionHeaderHeight = 44.0;
    const reactionHeaderMargin = 8.0;
    final actionsCardHeight = items.isNotEmpty ? items.length * itemHeight + 12.0 : 0.0;
    final statsHeight = showStats ? 40.0 : 0.0;

    final expandedReactionHeight = math.max(
      390.0,
      actionsCardHeight + reactionHeaderHeight + reactionHeaderMargin + statsHeight,
    );
    final maxAllowedHeight = screenSize.height - edgePadding * 2;
    final targetExpandedHeight = math.min(expandedReactionHeight, maxAllowedHeight);

    final collapsedTotalHeight =
        (message.isPending ? 0.0 : (reactionHeaderHeight + reactionHeaderMargin)) +
        actionsCardHeight +
        statsHeight;

    final neededHeight = math.max(
      _isReactionExpanded ? targetExpandedHeight : 0.0,
      collapsedTotalHeight,
    );

    // Position clamping
    double x = position.dx;
    double y = position.dy;

    if (x + menuWidth > screenSize.width - edgePadding) {
      x = screenSize.width - menuWidth - edgePadding;
    }
    if (x < edgePadding) {
      x = edgePadding;
    }

    if (y + neededHeight > screenSize.height - edgePadding) {
      y = y - neededHeight;
    }
    if (y < edgePadding) {
      y = edgePadding;
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
        AnimatedPositioned(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          left: x,
          top: y,
          child: Material(
            color: Colors.transparent,
            child: SizedBox(
              width: menuWidth,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  // Base column: Spacer for reaction header + actions + stats
                  Container(
                    constraints: BoxConstraints(
                      minHeight: _isReactionExpanded ? targetExpandedHeight : 0.0,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (!message.isPending)
                          const SizedBox(
                            height: reactionHeaderHeight + reactionHeaderMargin,
                          ),
                        AnimatedOpacity(
                          duration: const Duration(milliseconds: 180),
                          opacity: _isReactionExpanded ? 0.0 : 1.0,
                          child: IgnorePointer(
                            ignoring: _isReactionExpanded,
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                if (items.isNotEmpty) ...[
                                  ClipRRect(
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
                                          color: colorScheme.surfaceContainerHighest
                                              .withValues(alpha: 0.88),
                                          borderRadius: BorderRadius.circular(20),
                                          border: Border.all(
                                            color: colorScheme.outlineVariant
                                                .withValues(alpha: 0.35),
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
                                                  ? colorScheme.error.withValues(
                                                      alpha: 0.1,
                                                    )
                                                  : colorScheme.surfaceContainerHigh
                                                      .withValues(alpha: 0.5),
                                              splashColor: item.isDanger
                                                  ? colorScheme.error.withValues(
                                                      alpha: 0.2,
                                                    )
                                                  : colorScheme.primary.withValues(
                                                      alpha: 0.15,
                                                    ),
                                              child: Container(
                                                height: itemHeight,
                                                padding: const EdgeInsets.symmetric(
                                                  horizontal: 10,
                                                ),
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
                                                        overflow:
                                                            TextOverflow.ellipsis,
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
                                ],
                                if (showStats) ...[
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      if (!message.isPending && hasRead)
                                        Expanded(
                                          child: _buildStatPill(
                                            context: context,
                                            icon: HugeIcons.strokeRoundedView,
                                            text: '$readCount',
                                          ),
                                        ),
                                      if (!message.isPending && hasRead && hasReactions)
                                        const SizedBox(width: 8),
                                      if (hasReactions)
                                        Expanded(
                                          child: _buildStatPill(
                                            context: context,
                                            icon: HugeIcons.strokeRoundedSmile,
                                            text: '$totalReactions',
                                          ),
                                        ),
                                    ],
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Floating ReactionMenu Header (in quick mode it sits in the spacer; in full mode it expands over the menu)
                  if (!message.isPending)
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: ReactionMenu(
                        width: menuWidth,
                        expandedHeight: targetExpandedHeight,
                        onSelectEmoji: (emoji) {
                          Navigator.of(context).pop();
                          methods.toggleReaction(message, emoji);
                        },
                        onExpandChanged: (expanded) {
                          setState(() {
                            _isReactionExpanded = expanded;
                          });
                        },
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
