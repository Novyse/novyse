import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/share/incoming_share_store.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Pick-mode banner shown above the chat list while a share from another
/// app is pending. Text goes to the input, files to the draft bar once
/// a chat is opened. X discards the share.
class IncomingShareBanner extends ConsumerWidget {
  const IncomingShareBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pending = ref.watch(incomingShareProvider);
    if (pending.isEmpty) return const SizedBox.shrink();
    final l10n = context.l10n;
    final scheme = Theme.of(context).colorScheme;

    final preview = pending.text.trim().isEmpty
        ? l10n.incomingShareFiles(pending.files.length)
        : pending.text.trim().split('\n').first;

    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
      child: Material(
        color: scheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outlineVariant),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              AppHugeIcon(
                icon: HugeIcons.strokeRoundedShare08,
                color: scheme.primary,
                size: 20,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      l10n.incomingShareTitle,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: scheme.onSurface,
                      ),
                    ),
                    Text(
                      pending.files.isNotEmpty && pending.text.trim().isNotEmpty
                          ? '$preview • ${l10n.incomingShareFiles(pending.files.length)}'
                          : preview,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    Text(
                      l10n.incomingShareHint,
                      style: TextStyle(
                        fontSize: 11,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: l10n.incomingShareDiscard,
                icon: AppHugeIcon(
                  icon: HugeIcons.strokeRoundedCancel01,
                  color: scheme.onSurfaceVariant,
                  size: 20,
                ),
                onPressed: () =>
                    ref.read(incomingShareProvider.notifier).clear(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
