import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/router/chat_routes.dart';
import 'package:novyse/core/storage/file/file_utils.dart';
import 'package:novyse/core/storage/file/playable_uri.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/slider/app_progress_slider.dart';

import 'voice_bar_meta.dart';
import 'voice_bar_play_button.dart';
import 'voice_bar_speed_control.dart';

/// Global bar shown under the chat header while a voice/audio message is
/// active (playing or paused).
///
/// Tapping the info jumps to the source message (navigating to its chat
/// when needed). Hidden after [stop] or when the URI cannot be played.
class ChatActiveVoiceBar extends ConsumerWidget {
  const ChatActiveVoiceBar({
    super.key,
    this.currentChatUUID,
    this.currentSub,
    this.compact = false,
  });

  final String? currentChatUUID;
  final int? currentSub;
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final audio = ref.watch(chatAudioServiceProvider);
    final activeId = audio.activeId;
    final activeUri = audio.activeUri;
    if (activeId == null || !isPlayableMediaUri(activeUri)) {
      return const SizedBox.shrink();
    }

    final l10n = context.l10n;
    final scheme = Theme.of(context).colorScheme;
    final users = ref.watch(userStoreProvider.select((s) => s.users));
    final localUserUUID = ref.watch(
      userStoreProvider.select((s) => s.localUserUUID),
    );

    final senderUUID = audio.activeSenderUUID;
    final senderName =
        (senderUUID != null ? users[senderUUID]?.displayName : null) ??
        (senderUUID == localUserUUID && localUserUUID.isNotEmpty
            ? l10n.chatYou
            : null) ??
        l10n.msgFormatVoiceSingular;

    String? provenance;
    final originChatUUID = audio.activeChatUUID;
    if (originChatUUID != null && originChatUUID.isNotEmpty) {
      final originSub = audio.activeSubID ?? 0;
      final isSamePlace =
          currentChatUUID != null &&
          currentChatUUID == originChatUUID &&
          (currentSub == null || currentSub == originSub);
      if (!isSamePlace) {
        final chats = ref.watch(chatListProvider.select((s) => s.chats));
        final chat = chats.where((c) => c.uuid == originChatUUID).firstOrNull;
        final subID = audio.activeSubID ?? 0;
        final subName = chat?.subs
            .where((s) => (s['id'] as num?)?.toInt() == subID)
            .firstOrNull?['name']
            ?.toString();
        final base = chat?.name ?? originChatUUID;
        provenance = (subID > 0 && subName != null && subName.isNotEmpty)
            ? '$base (#$subName)'
            : base;
      }
    }

    final total = audio.duration;
    final totalMs = total.inMilliseconds;
    final positionMs = audio.position.inMilliseconds.toDouble();
    final positionLabel = formatTime(audio.position.inSeconds);
    final durationLabel = formatDuration(
      total > Duration.zero ? total.inSeconds : null,
    );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: () => _jumpToSource(context, ref),
        child: SizedBox(
          height: compact ? 72 : 78,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    VoiceBarPlayButton(
                      isPlaying: audio.isPlaying,
                      onToggle: () =>
                          audio.togglePlayPause(id: activeId, uri: activeUri!),
                      size: compact ? 34 : 38,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: VoiceBarMeta(
                        senderName: senderName,
                        positionLabel: positionLabel,
                        durationLabel: durationLabel,
                        provenance: provenance,
                      ),
                    ),
                    const SizedBox(width: 8),
                    VoiceBarSpeedControl(speed: audio.speed),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(
                        minWidth: 28,
                        minHeight: 28,
                      ),
                      tooltip: l10n.cancel,
                      icon: AppHugeIcon(
                        icon: HugeIcons.strokeRoundedCancel01,
                        size: 16,
                        color: scheme.onSurfaceVariant,
                      ),
                      onPressed: () => audio.stop(),
                    ),
                  ],
                ),
                AppProgressSlider(
                  positionMs: positionMs,
                  totalMs: totalMs.toDouble(),
                  onSeek: (v) => audio.seek(Duration(milliseconds: v.toInt())),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _jumpToSource(BuildContext context, WidgetRef ref) {
    final audio = ref.read(chatAudioServiceProvider);
    final chatUUID = audio.activeChatUUID;
    if (chatUUID == null || chatUUID.isEmpty) return;
    final subID = audio.activeSubID ?? 0;
    final messageID = audio.activeMessageID?.toString() ?? '';

    final notifier = ref.read(activeChatProvider.notifier);
    notifier.setSelectedChatUUID(chatUUID, subOverride: subID);
    notifier.setContentView('chat');
    if (messageID.isNotEmpty) {
      notifier.jumpToMessage(messageID, subID: subID);
    }
    context.go(chatSubPath(chatUUID, subID));
  }
}
