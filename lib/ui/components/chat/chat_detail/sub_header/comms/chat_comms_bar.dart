import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/router/chat_routes.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';

import 'package:novyse/ui/components/floating/floating_style.dart';

import 'comms_bar_actions.dart';
import 'comms_bar_info.dart';

/// Compact bar shown under the chat header while connected to a vocal room.
///
/// Shows the room's chat/sub names + remote participant count and quick
/// mic / webcam / leave actions. Tapping the info navigates to the room's
/// chat/sub and opens the vocal view. Hidden when not connected.
class ChatCommsBar extends ConsumerWidget {
  const ChatCommsBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final commsState = ref.watch(commsProvider);
    if (!commsState.connected || commsState.currentChatUUID == null) {
      return const SizedBox.shrink();
    }

    final targetChatUUID = commsState.currentChatUUID!;
    final targetSub = commsState.currentSub;
    final remoteCount = (commsState.room?.remoteParticipants.length ?? 0) + 1;

    final chats = ref.watch(chatListProvider.select((s) => s.chats));
    final chat = chats.where((c) => c.uuid == targetChatUUID).firstOrNull;
    final chatName = chat?.name ?? targetChatUUID;
    final subName = chat?.subs
        .where((s) => (s['id'] as num?)?.toInt() == targetSub)
        .firstOrNull?['name']
        ?.toString();

    final l10n = context.l10n;

    return SizedBox(
      height: FloatingConsts.barOuterSize,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(
          FloatingConsts.subHeaderInnerRadius,
        ),
        clipBehavior: Clip.hardEdge,
        child: InkWell(
          borderRadius: BorderRadius.circular(
            FloatingConsts.subHeaderInnerRadius,
          ),
          onTap: () {
            final notifier = ref.read(activeChatProvider.notifier);
            notifier.setSelectedChatUUID(
              targetChatUUID,
              subOverride: targetSub,
            );
            notifier.setContentView('vocal');
            context.go(chatSubPath(targetChatUUID, targetSub));
          },
          child: Padding(
            padding: FloatingConsts.subHeaderInnerPadding,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: CommsBarInfo(
                    chatName: chatName,
                    subName: targetSub > 0 ? subName : null,
                    participantsLabel: l10n.notifCommsParticipants(remoteCount),
                  ),
                ),
                const SizedBox(
                  width: FloatingConsts.subHeaderActionsGap,
                ),
                const CommsBarActions(),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
