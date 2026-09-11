import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';

/// Interactive reaction pill displayed underneath messages and system messages.
///
/// Shows:
/// - The emoji
/// - Up to 2 overlapping user avatars without harsh borders
/// - The total reaction count badge (always visible)
/// - Highlighted border/background if the local user has reacted
/// - Tap to toggle the reaction
class ReactionPill extends ConsumerWidget {
  const ReactionPill({
    super.key,
    required this.emoji,
    required this.userUUIDs,
    required this.onTap,
    this.getUser,
  });

  final String emoji;
  final List<String> userUUIDs;
  final VoidCallback onTap;
  final UserModel? Function(String uuid)? getUser;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final localUserUUID = ref.watch(
      userStoreProvider.select((s) => s.localUserUUID),
    );
    final hasReacted = userUUIDs.contains(localUserUUID);

    final displayedAvatars = userUUIDs.take(2).toList();
    final count = userUUIDs.length;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
          decoration: BoxDecoration(
            color: hasReacted
                ? colorScheme.primary.withValues(alpha: 0.18)
                : colorScheme.surfaceContainerHighest.withValues(alpha: 0.85),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: hasReacted
                  ? colorScheme.primary.withValues(alpha: 0.6)
                  : colorScheme.outlineVariant.withValues(alpha: 0.4),
              width: hasReacted ? 1.2 : 0.8,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                emoji,
                style: const TextStyle(fontSize: 13, height: 1.1),
              ),
              if (displayedAvatars.isNotEmpty) ...[
                const SizedBox(width: 4),
                SizedBox(
                  height: 16,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      for (int i = 0; i < displayedAvatars.length; i++) ...[
                        Align(
                          widthFactor: i == 0 ? 1.0 : 0.65,
                          child: () {
                            final user = getUser?.call(displayedAvatars[i]) ??
                                ref.watch(
                                  userStoreProvider.select(
                                    (s) => s.users[displayedAvatars[i]],
                                  ),
                                );
                            return ClipOval(
                              child: Avatar(
                                uuid: user?.profilePictureUUID,
                                name: user?.name,
                                seedKey: user?.uuid ?? displayedAvatars[i],
                                size: 14,
                              ),
                            );
                          }(),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
              if (count > 0) ...[
                const SizedBox(width: 3),
                Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: hasReacted
                        ? colorScheme.primary
                        : colorScheme.onSurface,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
