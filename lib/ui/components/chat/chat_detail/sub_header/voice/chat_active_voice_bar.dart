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
import 'package:novyse/ui/components/floating/floating_style.dart';
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
  });

  final String? currentChatUUID;
  final int? currentSub;

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
          onTap: () => _jumpToSource(context, ref),
          child: Padding(
            padding: FloatingConsts.subHeaderInnerPadding,
            // Single 48px row: play left, meta compact, slider fills the
            // middle, speed + close pinned to the far right.
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                VoiceBarPlayButton(
                  isPlaying: audio.isPlaying,
                  onToggle: () =>
                      audio.togglePlayPause(id: activeId, uri: activeUri!),
                ),
                const SizedBox(
                  width: FloatingConsts.subHeaderContentGap,
                ),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 168),
                  child: VoiceBarMeta(
                    senderName: senderName,
                    positionLabel: positionLabel,
                    durationLabel: durationLabel,
                    provenance: provenance,
                  ),
                ),
                const SizedBox(
                  width: FloatingConsts.subHeaderActionsGap,
                ),
                Expanded(
                  child: AppProgressSlider(
                    positionMs: positionMs,
                    totalMs: totalMs.toDouble(),
                    onSeek: (v) =>
                        audio.seek(Duration(milliseconds: v.toInt())),
                    onSeekStart: audio.beginSeek,
                    onSeekEnd: audio.endSeek,
                  ),
                ),
                const SizedBox(
                  width: FloatingConsts.subHeaderActionsGap,
                ),
                VoiceBarSpeedControl(speed: audio.speed),
                const SizedBox(
                  width: FloatingConsts.subHeaderActionsGap,
                ),
                FloatingIconButton(
                  tooltip: l10n.cancel,
                  icon: AppHugeIcon(
                    icon: HugeIcons.strokeRoundedCancel01,
                    size: FloatingConsts.barIconSize,
                    color: scheme.onSurfaceVariant,
                  ),
                  onPressed: () => audio.stop(),
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
