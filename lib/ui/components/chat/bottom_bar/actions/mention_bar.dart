import 'dart:math' as math;
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';

/// Floating mention bar that displays a list of group/channel members
/// when typing '@query' in the chat input.
///
/// Encapsulates mention query detection, chat type validation (non-DM only),
/// member filtering, and mention selection handling.
class MentionBar extends ConsumerStatefulWidget {
  const MentionBar({
    super.key,
    required this.chatUUID,
    this.focusNode,
    this.members,
    this.onSelectMember,
  });

  final String chatUUID;
  final FocusNode? focusNode;

  /// Optional manual member override (e.g. for standalone widget testing).
  final List<UserModel>? members;

  /// Optional manual select callback override.
  final ValueChanged<UserModel>? onSelectMember;

  @override
  ConsumerState<MentionBar> createState() => _MentionBarState();
}

class _MentionBarState extends ConsumerState<MentionBar> {
  TextEditingController? _controller;

  @override
  void initState() {
    super.initState();
    _attachController();
  }

  @override
  void didUpdateWidget(covariant MentionBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chatUUID != widget.chatUUID) {
      _detachController();
      _attachController();
    }
  }

  void _attachController() {
    if (widget.members != null) return;
    _controller = ref.read(chatTextControllerProvider(widget.chatUUID));
    _controller?.addListener(_onTextChanged);
  }

  void _detachController() {
    _controller?.removeListener(_onTextChanged);
    _controller = null;
  }

  void _onTextChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _detachController();
    super.dispose();
  }

  void _handleSelectMember(UserModel member, TextEditingController controller) {
    if (widget.onSelectMember != null) {
      widget.onSelectMember!(member);
      return;
    }

    final text = controller.text;
    final cursor = controller.selection.baseOffset;
    final textBeforeCursor = (cursor >= 0 && cursor <= text.length)
        ? text.substring(0, cursor)
        : text;
    final textAfterCursor = (cursor >= 0 && cursor <= text.length)
        ? text.substring(cursor)
        : '';

    final lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex != -1) {
      final newPrefix =
          '${textBeforeCursor.substring(0, lastAtIndex)}@${member.handle} ';
      final newText = '$newPrefix$textAfterCursor';
      controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: newPrefix.length),
      );
      ref.read(chatDraftProvider(widget.chatUUID).notifier).setText(newText);
    }
    widget.focusNode?.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    List<UserModel> displayMembers;
    TextEditingController? activeController;

    if (widget.members != null) {
      displayMembers = widget.members!;
      if (displayMembers.isEmpty) return const SizedBox.shrink();
    } else {
      // 1. Only show for non-DM chats
      final chat = ref.watch(chatProvider(widget.chatUUID));
      if (chat == null || chat.type == 'DM') {
        return const SizedBox.shrink();
      }

      // 2. Read text and cursor from controller
      final controller = ref.watch(chatTextControllerProvider(widget.chatUUID));
      activeController = controller;
      final text = controller.text;
      final cursor = controller.selection.baseOffset;
      final textBeforeCursor = (cursor >= 0 && cursor <= text.length)
          ? text.substring(0, cursor)
          : text;

      // 3. Match @handle query
      final mentionMatch = RegExp(r'(?:^|\s)@([a-zA-Z0-9_.-]*)$')
          .firstMatch(textBeforeCursor);
      if (mentionMatch == null) {
        return const SizedBox.shrink();
      }

      final query = mentionMatch.group(1)!.toLowerCase();
      final users = ref.watch(userStoreProvider.select((s) => s.users));
      final localUserUUID = ref.watch(
        userStoreProvider.select((s) => s.localUserUUID),
      );

      // 4. Filter members of chat (excluding local user)
      displayMembers = chat.members
          .map((m) {
            final uid = (m['userUUID'] ?? m['uuid'])?.toString() ?? '';
            final user = users[uid];
            if (user != null) return user;
            return UserModel(
              uuid: uid,
              name: m['name']?.toString() ?? '',
              surname: m['surname']?.toString(),
              handle: m['handle']?.toString(),
              profilePictureUUID: m['profilePictureUUID']?.toString(),
            );
          })
          .where(
            (u) =>
                u.uuid.isNotEmpty &&
                u.uuid != localUserUUID &&
                u.handle != null &&
                u.handle!.isNotEmpty &&
                (u.handle!.toLowerCase().contains(query) ||
                    u.displayName.toLowerCase().contains(query)),
          )
          .toList();

      if (displayMembers.isEmpty) {
        return const SizedBox.shrink();
      }
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final listHeight = math.min(220.0, displayMembers.length * 52.0 + 8.0);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      constraints: const BoxConstraints(maxHeight: 220),
      height: listHeight,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.4),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: 4),
            itemCount: displayMembers.length,
            separatorBuilder: (context, index) => Divider(
              height: 1,
              thickness: 1,
              indent: 12,
              endIndent: 12,
              color: colorScheme.outlineVariant.withValues(alpha: 0.15),
            ),
            itemBuilder: (context, index) {
              final member = displayMembers[index];
              return InkWell(
                onTap: () {
                  if (widget.onSelectMember != null) {
                    widget.onSelectMember!(member);
                  } else if (activeController != null) {
                    _handleSelectMember(member, activeController);
                  }
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      Avatar(
                        uuid: member.profilePictureUUID,
                        name: member.displayName,
                        size: 32,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          member.displayName,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '@${member.handle}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
