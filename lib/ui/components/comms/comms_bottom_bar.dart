import 'dart:io' as io;
import 'dart:ui';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/comms/screen_share_selector_modal.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/status/status_message.dart';

/// Floating bottom control bar for vocal communication.
class CommsBottomBar extends ConsumerWidget {
  final String chatUUID;
  final int sub;

  const CommsBottomBar({super.key, required this.chatUUID, this.sub = 0});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final commsState = ref.watch(commsProvider);
    final isConnected = commsState.isRoomMatch(chatUUID, sub);
    final controller = ref.read(commsProvider.notifier);

    return Align(
      alignment: Alignment.bottomCenter,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Error banner using StatusMessage
            if (commsState.errorMessage != null ||
                commsState.errorMessageBuilder != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: StatusMessage(
                  type: StatusMessageType.danger,
                  closable: true,
                  onClose: controller.clearError,
                  content: commsState.errorMessage != null
                      ? [commsState.errorMessage!]
                      : const [],
                  contentBuilders: commsState.errorMessageBuilder != null
                      ? [commsState.errorMessageBuilder!]
                      : null,
                ),
              ),

            // Connection or Control bar
            if (!isConnected)
              _buildJoinButton(context, l10n, commsState, controller)
            else
              _buildControlBar(context, l10n, ref, commsState, controller),
          ],
        ),
      ),
    );
  }

  Widget _buildJoinButton(
    BuildContext context,
    AppLocalizations l10n,
    commsState,
    CommsNotifier controller,
  ) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(100),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.45),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 16,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Center(
            child: commsState.connecting
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.white,
                    ),
                  )
                : IconButton(
                    icon: const AppHugeIcon(
                      icon: HugeIcons.strokeRoundedCall02,
                      color: AppColors.success,
                      size: 26,
                    ),
                    tooltip: l10n.commsJoinRoom,
                    onPressed: () => controller.join(chatUUID, sub: sub),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildControlBar(
    BuildContext context,
    AppLocalizations l10n,
    WidgetRef ref,
    commsState,
    CommsNotifier controller,
  ) {
    final isDesktop =
        !kIsWeb &&
        (io.Platform.isLinux || io.Platform.isMacOS || io.Platform.isWindows);

    return ClipRRect(
      borderRadius: BorderRadius.circular(100),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.45),
            borderRadius: BorderRadius.circular(100),
            border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.25),
                blurRadius: 16,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 1. Microphone toggle
              _buildIconButton(
                icon: commsState.isAudioEnabled
                    ? HugeIcons.strokeRoundedMic02
                    : HugeIcons.strokeRoundedMicOff02,
                tooltip: commsState.isAudioEnabled
                    ? l10n.commsMuteMic
                    : l10n.commsUnmuteMic,
                backgroundColor: !commsState.isAudioEnabled
                    ? AppColors.danger
                    : Colors.white.withValues(alpha: 0.12),
                iconColor: Colors.white,
                onPressed: controller.toggleAudio,
              ),
              const SizedBox(width: 8),

              // 2. Camera toggle
              _buildIconButton(
                icon: commsState.isVideoEnabled
                    ? HugeIcons.strokeRoundedVideo02
                    : HugeIcons.strokeRoundedVideoOff,
                tooltip: commsState.isVideoEnabled
                    ? l10n.commsTurnOffCamera
                    : l10n.commsTurnOnCamera,
                backgroundColor: commsState.isVideoEnabled
                    ? AppColors.primary
                    : Colors.white.withValues(alpha: 0.12),
                iconColor: Colors.white,
                onPressed: controller.toggleVideo,
              ),
              const SizedBox(width: 8),

              // 3. Speaker Output (Deafen) toggle
              _buildIconButton(
                icon: commsState.isAudioOutputEnabled
                    ? HugeIcons.strokeRoundedVolumeHigh
                    : HugeIcons.strokeRoundedVolumeOff,
                tooltip: commsState.isAudioOutputEnabled
                    ? l10n.commsDeafen
                    : l10n.commsUndeafen,
                backgroundColor: !commsState.isAudioOutputEnabled
                    ? AppColors.danger
                    : Colors.white.withValues(alpha: 0.12),
                iconColor: Colors.white,
                onPressed: controller.toggleAudioOutput,
              ),
              const SizedBox(width: 8),

              // 4. Screen share picker
              _buildIconButton(
                icon: HugeIcons.strokeRoundedComputerScreenShare,
                tooltip: l10n.commsShareScreen,
                backgroundColor: Colors.white.withValues(alpha: 0.12),
                iconColor: Colors.white,
                onPressed: () async {
                  if (isDesktop) {
                    final selection = await ScreenShareSelectorModal.show(
                      context,
                    );
                    if (selection != null) {
                      await controller.startScreenShare(
                        sourceId: selection.source?.id,
                        captureScreenAudio: selection.includeAudio,
                      );
                    }
                  } else {
                    await controller.startScreenShare();
                  }
                },
              ),
              const SizedBox(width: 8),

              // 5. Settings button (no-op for now)
              _buildIconButton(
                icon: HugeIcons.strokeRoundedSettings01,
                tooltip: l10n.settings,
                backgroundColor: Colors.white.withValues(alpha: 0.12),
                iconColor: Colors.white,
                onPressed: () {
                  // No-op for now as requested
                },
              ),
              const SizedBox(width: 12),

              // 6. Leave vocal call button
              _buildIconButton(
                icon: HugeIcons.strokeRoundedCallEnd01,
                tooltip: l10n.commsLeaveRoom,
                backgroundColor: AppColors.danger,
                iconColor: Colors.white,
                onPressed: controller.leave,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIconButton({
    required dynamic icon,
    required String tooltip,
    required Color backgroundColor,
    required Color iconColor,
    required VoidCallback onPressed,
  }) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: backgroundColor,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(
            width: 44,
            height: 44,
            child: Center(
              child: AppHugeIcon(icon: icon, color: iconColor, size: 20),
            ),
          ),
        ),
      ),
    );
  }
}
