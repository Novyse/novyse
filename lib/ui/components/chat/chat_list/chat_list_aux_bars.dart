import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/ui/components/chat/chat_detail/sub_header/sub_header_aux_bars.dart';

/// Voice + comms bars shown under the global status bar in the chat list.
///
/// Visible on every layout (mobile and desktop) but only when no chat is
/// open. Each bar self-hides when inactive.
class ChatListAuxBars extends ConsumerWidget {
  const ChatListAuxBars({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedChatUUID = ref.watch(
      activeChatProvider.select((s) => s.selectedChatUUID),
    );
    if (selectedChatUUID != null) return const SizedBox.shrink();
    return const SubHeaderAuxBars(framed: true);
  }
}
