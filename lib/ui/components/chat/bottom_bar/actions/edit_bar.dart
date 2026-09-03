import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class EditBar extends ConsumerWidget {
  const EditBar({super.key, required this.chatUUID});

  final String chatUUID;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final editingMessage = ref
        .watch(chatDraftProvider(chatUUID))
        .editingMessage;
    if (editingMessage == null) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    String content = '';
    if (editingMessage is Map) {
      content = (editingMessage['content'] ?? '').toString();
    } else if (editingMessage is String) {
      content = editingMessage;
    }

    void handleCancelEdit() {
      ref.read(chatDraftProvider(chatUUID).notifier).setEditingMessage(null);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.4),
        ),
      ),
      child: Row(
        children: [
          AppHugeIcon(
            icon: HugeIcons.strokeRoundedPencilEdit02,
            size: 18,
            color: colorScheme.primary,
          ),
          const SizedBox(width: 8),
          Container(
            width: 3,
            height: 24,
            decoration: BoxDecoration(
              color: colorScheme.primary,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  l10n.editingMessage,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
                Text(
                  content,
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
          InkWell(
            onTap: handleCancelEdit,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: AppHugeIcon(
                icon: HugeIcons.strokeRoundedCancel01,
                size: 16,
                color: colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
