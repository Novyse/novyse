part of '../comms_controller.dart';

/// Local screen-share publish / unpublish.
mixin CommsScreenshareMixin on Notifier<CommsState> {
  /// Starts screen sharing. Supports multiple concurrent shares
  Future<void> startScreenShare({
    String? sourceId,
    bool captureScreenAudio = true,
  }) async {
    final room = state.room;
    if (room?.localParticipant == null) return;

    try {
      // Using createScreenShareTrack allows publishing multiple screen shares
      final track = await LocalVideoTrack.createScreenShareTrack(
        ScreenShareCaptureOptions(
          sourceId: sourceId,
          captureScreenAudio: captureScreenAudio,
        ),
      );

      final pub = await room!.localParticipant!.publishVideoTrack(track);
      state = state.copyWith(
        activeScreenShareTrackSids: {
          ...state.activeScreenShareTrackSids,
          pub.sid,
        },
      );
    } catch (e) {
      debugPrint('[CommsController] Screen share failed or cancelled: $e');
    }
  }

  /// Stops a specific local screen share by its track SID.
  /// If trackSid is null and there are active shares, stops the first one.
  Future<void> stopScreenShare([String? trackSid]) async {
    final room = state.room;
    final localParticipant = room?.localParticipant;
    if (localParticipant == null) return;

    final targetSid = trackSid ?? state.activeScreenShareTrackSids.firstOrNull;
    if (targetSid == null) return;

    try {
      final publication = localParticipant.videoTrackPublications
          .where((p) => p.sid == targetSid)
          .firstOrNull;

      if (publication != null && publication.track != null) {
        final track = publication.track!;
        await track.stop();
        await localParticipant.removePublishedTrack(targetSid);
      } else {
        await localParticipant.setScreenShareEnabled(false);
      }

      final updatedSids = Set<String>.from(state.activeScreenShareTrackSids)
        ..remove(targetSid);
      state = state.copyWith(activeScreenShareTrackSids: updatedSids);

      if (state.pinnedStreamId == targetSid) {
        state = state.copyWith(pinnedStreamId: () => null);
      }
      if (state.fullscreenStreamId == targetSid) {
        state = state.copyWith(fullscreenStreamId: () => null);
      }
    } catch (e) {
      debugPrint('[CommsController] Error stopping screen share: $e');
    }
  }
}
