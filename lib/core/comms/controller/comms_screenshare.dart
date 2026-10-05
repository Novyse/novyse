part of '../comms_controller.dart';

/// Local screen-share publish / unpublish.
mixin CommsScreenshareMixin on Notifier<CommsState> {
  /// Starts screen sharing. Supports multiple concurrent shares.
  Future<void> startScreenShare({
    String? sourceId,
    bool captureScreenAudio = true,
  }) async {
    final room = state.room;
    if (room?.localParticipant == null) return;

    try {
      // Using createScreenShareTracksWithAudio allows publishing multiple
      // screen shares.
      final tracks = await LocalVideoTrack.createScreenShareTracksWithAudio(
        ScreenShareCaptureOptions(
          sourceId: sourceId,
          captureScreenAudio: captureScreenAudio,
        ),
      );

      String? videoSid;
      String? audioSid;
      for (final track in tracks) {
        if (track is LocalVideoTrack) {
          final pub = await room!.localParticipant!.publishVideoTrack(track);
          videoSid = pub.sid;
        } else if (track is LocalAudioTrack && captureScreenAudio) {
          final pub = await room!.localParticipant!.publishAudioTrack(track);
          audioSid = pub.sid;
        }
      }
      if (videoSid == null) return;

      state = state.copyWith(
        activeScreenShareTrackSids: {
          ...state.activeScreenShareTrackSids,
          videoSid,
        },
        screenShareAudioSids: audioSid == null
            ? state.screenShareAudioSids
            : {...state.screenShareAudioSids, videoSid: audioSid},
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

      // Stop and unpublish the audio track paired with this share, if any.
      final audioSid = state.screenShareAudioSids[targetSid];
      if (audioSid != null) {
        try {
          final audioPub = localParticipant.audioTrackPublications
              .where((p) => p.sid == audioSid)
              .firstOrNull;
          await audioPub?.track?.stop();
          await localParticipant.removePublishedTrack(audioSid);
        } catch (e) {
          debugPrint('[CommsController] Error stopping share audio: $e');
        }
      }

      final updatedSids = Set<String>.from(state.activeScreenShareTrackSids)
        ..remove(targetSid);
      final updatedAudioSids = Map<String, String>.from(
        state.screenShareAudioSids,
      )..remove(targetSid);
      state = state.copyWith(
        activeScreenShareTrackSids: updatedSids,
        screenShareAudioSids: updatedAudioSids,
      );

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
