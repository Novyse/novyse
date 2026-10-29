import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/storage/file/playable_uri.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_pinned_messages_bar.dart';
import 'package:novyse/ui/components/chat/chat_detail/sub_header/comms/chat_comms_bar.dart';
import 'package:novyse/ui/components/chat/chat_detail/sub_header/voice/chat_active_voice_bar.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';

/// General unified sub-header bar displayed directly under the main floating header.
///
/// Stacks up to 3 bars in order: pinned messages, active voice/audio,
/// comms. Visibility rules:
/// - vocal view: never pinned; voice
///   when active; comms only when the room belongs to a different chat/sub.
/// - chat view: pinned when present; voice when active; comms when connected.
/// - search/selection headers pass [showAuxBars] = false (only pinned).
class ChatSubHeader extends ConsumerWidget {
  const ChatSubHeader({
    super.key,
    required this.chatUUID,
    this.showAuxBars = true,
  });

  final String chatUUID;
  final bool showAuxBars;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chat = ref.watch(chatProvider(chatUUID));

    final isVocalView = ref.watch(
      activeChatProvider.select((s) => s.contentView == 'vocal'),
    );

    final hasPinnedMessages =
        chat != null && chat.pinnedMessages.isNotEmpty && !isVocalView;

    final audio = ref.watch(chatAudioServiceProvider);
    final hasVoice =
        showAuxBars &&
        audio.activeId != null &&
        isPlayableMediaUri(audio.activeUri);

    final commsState = ref.watch(commsProvider);
    final commsConnected =
        commsState.connected && commsState.currentChatUUID != null;
    final selectedSub = ref.watch(
      activeChatProvider.select((s) => s.selectedSub),
    );
    final commsIsDifferentRoom =
        commsState.currentChatUUID != chatUUID ||
        commsState.currentSub != selectedSub;
    final hasComms =
        showAuxBars && commsConnected && (!isVocalView || commsIsDifferentRoom);

    if (!hasPinnedMessages && !hasVoice && !hasComms) {
      return const SizedBox.shrink();
    }

    return FloatingPill(
      radius: FloatingConsts.subHeaderRadius,
      padding: FloatingConsts.subHeaderOuterPadding,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: FloatingConsts.subHeaderGap,
        children: [
          if (hasPinnedMessages) ChatPinnedMessagesBar(chatUUID: chatUUID),
          if (hasVoice)
            ChatActiveVoiceBar(
              currentChatUUID: chatUUID,
              currentSub: selectedSub,
            ),
          if (hasComms) const ChatCommsBar(),
        ],
      ),
    );
  }
}
