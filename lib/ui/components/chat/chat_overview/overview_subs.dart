import 'package:flutter/material.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/chat_list_store.dart';

class OverviewSubSection extends StatelessWidget {
  const OverviewSubSection({
    super.key,
    required this.chat,
    required this.effectiveSub,
    required this.onSelect,
  });

  final ChatModel chat;
  final int effectiveSub;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    if (chat.subs.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
            child: Text(
              l10n.overviewSubChannels,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
          ),
          for (var i = 0; i < chat.subs.length; i++) ...[
            OverviewSubRow(
              sub: chat.subs[i],
              isActive: (chat.subs[i]['id'] as num).toInt() == effectiveSub,
              onTap: () => onSelect((chat.subs[i]['id'] as num).toInt()),
            ),
            if (i != chat.subs.length - 1)
              Divider(
                height: 1,
                indent: 16,
                endIndent: 16,
                color: colorScheme.outline.withValues(alpha: 0.15),
              ),
          ],
          const SizedBox(height: 6),
        ],
      ),
    );
  }
}

class OverviewSubRow extends StatelessWidget {
  const OverviewSubRow({
    super.key,
    required this.sub,
    required this.isActive,
    required this.onTap,
  });

  final Map<String, dynamic> sub;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final rawName = sub['name']?.toString().trim() ?? '';
    final id = (sub['id'] as num).toInt();
    final name = rawName.isNotEmpty ? rawName : 'Sub $id';
    final type = (sub['type']?.toString() ?? '').toUpperCase();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isActive
                    ? colorScheme.primary
                    : colorScheme.surfaceContainerHighest,
              ),
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : '#',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isActive
                      ? colorScheme.onPrimary
                      : colorScheme.onSurfaceVariant,
                ),
              ),
            ),
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
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                  if (type.isNotEmpty)
                    Text(
                      type,
                      style: TextStyle(
                        fontSize: 11,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
            ),
            if (isActive)
              Icon(Icons.check_circle, size: 20, color: colorScheme.primary)
            else
              Icon(
                Icons.chevron_right,
                size: 20,
                color: colorScheme.onSurfaceVariant,
              ),
          ],
        ),
      ),
    );
  }
}
