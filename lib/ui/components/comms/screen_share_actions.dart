import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_share_config.dart';
import 'package:novyse/core/comms/devices/comms_screenshare_android.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/ui/components/comms/screen_share_edit_modal.dart';
import 'package:novyse/ui/components/comms/screen_share_selector_modal.dart';

/// Shared orchestration for the screen-share setup/edit menus.
abstract final class ScreenShareActions {
  static Future<void> startShareFlow(
    BuildContext context,
    WidgetRef ref, {
    ScreenShareConfig? initial,
  }) async {
    final defaults = initial ??
        ScreenShareConfig.fromSettings(ref.read(settingsControllerProvider));
    final result = await ScreenShareSelectorModal.show(
      context,
      initial: defaults,
      isPremium: ref.read(isPremiumProvider),
    );
    if (result == null || !context.mounted) return;
    final controller = ref.read(commsProvider.notifier);
    if (result.previewVideoTrack != null) {
    
      final sid = await controller.publishPreviewShare(
        videoTrack: result.previewVideoTrack!,
        audioTracks: result.previewAudioTracks,
        config: result.config,
        captureScreenAudio: result.includeAudio,
      );
      if (sid == null) {
        try {
          await result.previewVideoTrack!.stop();
        } catch (_) {}
        for (final audio in result.previewAudioTracks) {
          try {
            await audio.stop();
          } catch (_) {}
        }
        await CommsScreenshareAndroid.teardownProjectionService();
      }
    } else {
      if (CommsScreenshareAndroid.isAndroid) {
        final ready = await CommsScreenshareAndroid.ensureProjectionReady();
        if (!ready) return;
      }
      final sid = await controller.startScreenShare(
        sourceId: result.source?.id,
        config: result.config,
        captureScreenAudio: result.includeAudio,
      );
      if (sid == null) {
        await CommsScreenshareAndroid.teardownProjectionService();
      }
    }
  }

  /// Per-share edit flow for the live share [trackSid] (pencil menu).
  static Future<void> editShareFlow(
    BuildContext context,
    WidgetRef ref,
    String trackSid,
  ) async {
    final comms = ref.read(commsProvider.notifier);
    final state = ref.read(commsProvider);
    final current =
        state.screenShareConfigs[trackSid] ?? const ScreenShareConfig();
    final hasAudio = state.screenShareAudioSids.containsKey(trackSid);
    final sourceId = state.screenShareSourceIds[trackSid];

    final result = await ScreenShareEditModal.show(
      context,
      current: current,
      hasAudio: hasAudio,
      currentSourceId: sourceId,
    );
    if (result == null || !context.mounted) return;

    // Native-picker flow: the source can only change through the OS picker.
    if (result.repickSource) {
      await comms.stopScreenShare(trackSid);
      if (!context.mounted) return;
      await startShareFlow(context, ref, initial: current);
      return;
    }

    // Source switch (custom-picker flow)
    if (result.newSourceId != null) {
      final ok = await comms.switchScreenShareSource(
        trackSid,
        result.newSourceId!,
      );
      if (!ok) return;
    }

    // Audio toggle.
    if (result.audioEnabled != null) {
      if (!result.audioEnabled!) {
        await comms.setScreenShareAudio(trackSid, false);
      } else {
        final ok = await comms.setScreenShareAudio(trackSid, true);
        if (!ok && context.mounted) {
          // No audio track to re-enable: recreate the share with audio.
          final cfg =
              ref.read(commsProvider).screenShareConfigs[trackSid] ?? current;
          final id = ref
              .read(commsProvider)
              .screenShareSourceIds[trackSid];
          await comms.stopScreenShare(trackSid);
          if (!context.mounted) return;
          if (id != null && id.isNotEmpty) {
            await ref
                .read(commsProvider.notifier)
                .startScreenShare(
                  sourceId: id,
                  config: cfg,
                  captureScreenAudio: true,
                );
          } else {
            await startShareFlow(context, ref, initial: cfg);
          }
        }
      }
    }
  }
}
