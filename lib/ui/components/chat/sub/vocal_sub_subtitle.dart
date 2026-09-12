import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/comms/comms_data_provider.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';

/// Shows participant avatars for a VOCAL sub, or [defaultPreview] when empty.
class VocalSubSubtitle extends ConsumerWidget {
  const VocalSubSubtitle({
    super.key,
    required this.chatUUID,
    required this.subId,
    this.defaultPreview,
  });

  final String chatUUID;
  final int subId;
  final String? defaultPreview;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roomData = ref.watch(
      commsDataProvider((chatUUID: chatUUID, sub: subId)),
    );
    final participants = roomData.tiles
        .where((t) => !t.isScreenShare)
        .toList();
    final users = ref.watch(userStoreProvider.select((s) => s.users));
    final colorScheme = Theme.of(context).colorScheme;

    if (participants.isEmpty) {
      final preview = defaultPreview ?? '';
      if (preview.isEmpty) return const SizedBox.shrink();
      return Text(
        preview,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(fontSize: 12, color: colorScheme.onSurfaceVariant),
      );
    }

    final avatars = participants.take(3).toList();
    final overflow = participants.length - avatars.length;

    return Row(
      children: [
        for (final tile in avatars)
          Padding(
            padding: const EdgeInsets.only(right: 2),
            child: Avatar(
              uuid: users[tile.userUUID]?.profilePictureUUID,
              name: users[tile.userUUID]?.displayName,
              seedKey: tile.userUUID,
              size: 18,
            ),
          ),
        if (overflow > 0)
          Text(
            '+$overflow',
            style: TextStyle(fontSize: 12, color: colorScheme.onSurfaceVariant),
          ),
      ],
    );
  }
}
