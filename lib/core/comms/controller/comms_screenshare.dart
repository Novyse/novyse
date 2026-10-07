part of '../comms_controller.dart';

/// Local screen-share publish / unpublish.
mixin CommsScreenshareMixin
    on Notifier<CommsState>, CommsMediaSettingsMixin, CommsDevicesLiveMixin {
  /// Starts screen sharing from an explicit per-share config.
  /// Supports multiple concurrent shares. Returns the video publication SID.
  Future<String?> startScreenShare({
    String? sourceId,
    required ScreenShareConfig config,
    bool captureScreenAudio = true,
  }) async {
    final room = state.room;
    if (room?.localParticipant == null) return null;

    try {
      final captureOptions = config.captureOptions(
        sourceId: sourceId,
        captureScreenAudio: captureScreenAudio,
      );
      final params = captureOptions.params;
      CommsMediaConstraints.debugCommsMedia(
        'start screen share: mode=${config.mode} '
        'sourceId=${sourceId ?? '<os-picker>'} '
        '${params.dimensions.width}x${params.dimensions.height} '
        'fps=${params.encoding?.maxFramerate} '
        'bitrate=${params.encoding?.maxBitrate} audio=$captureScreenAudio',
      );
      final tracks = await LocalVideoTrack.createScreenShareTracksWithAudio(
        captureOptions,
      );
      final videoTracks = tracks.whereType<LocalVideoTrack>().toList();
      final audioTracks = tracks.whereType<LocalAudioTrack>().toList();
      if (videoTracks.isEmpty) {
        for (final t in tracks) {
          try {
            await t.stop();
          } catch (_) {}
        }
        return null;
      }
      return await _publishShareTracks(
        videoTrack: videoTracks.first,
        audioTracks: audioTracks,
        config: config,
        sourceId: sourceId,
        captureScreenAudio: captureScreenAudio,
      );
    } catch (e) {
      debugPrint('[CommsController] Screen share failed or cancelled: $e');
      return null;
    }
  }

  /// Publishes tracks already captured in the setup menu (native-picker flow:
  /// the OS picker ran there, so the tracks must be reused, never recreated).
  /// Returns the video publication SID.
  Future<String?> publishPreviewShare({
    required LocalVideoTrack videoTrack,
    List<LocalAudioTrack> audioTracks = const [],
    required ScreenShareConfig config,
    bool captureScreenAudio = true,
  }) async {
    if (state.room?.localParticipant == null) return null;
    try {
      return await _publishShareTracks(
        videoTrack: videoTrack,
        audioTracks: audioTracks,
        config: config,
        sourceId: null,
        captureScreenAudio: captureScreenAudio,
      );
    } catch (e) {
      debugPrint('[CommsController] Preview share publish failed: $e');
      return null;
    }
  }

  Future<String?> _publishShareTracks({
    required LocalVideoTrack videoTrack,
    required List<LocalAudioTrack> audioTracks,
    required ScreenShareConfig config,
    required String? sourceId,
    required bool captureScreenAudio,
  }) async {
    final local = state.room!.localParticipant!;
    int? sourceWidth;
    int? sourceHeight;
    try {
      final settings = videoTrack.mediaStreamTrack.getSettings();
      if (settings['width'] is int && (settings['width'] as int) > 0) {
        sourceWidth = settings['width'] as int;
      }
      if (settings['height'] is int && (settings['height'] as int) > 0) {
        sourceHeight = settings['height'] as int;
      }
    } catch (_) {}

    final resolvedCapture = config.captureOptions(
      sourceId: sourceId,
      captureScreenAudio: captureScreenAudio,
      sourceWidth: sourceWidth,
      sourceHeight: sourceHeight,
    );
    videoTrack.currentOptions = resolvedCapture;
    try {
      await videoTrack.mediaStreamTrack.applyConstraints({
        'width': resolvedCapture.params.dimensions.width,
        'height': resolvedCapture.params.dimensions.height,
        'frameRate': resolvedCapture.maxFrameRate,
      });
    } catch (_) {}

    final params = config.resolveParams(
      sourceWidth: sourceWidth,
      sourceHeight: sourceHeight,
    );
    debugPrint(
      '[CommsMedia] publish share: mode=${config.mode} '
      '${params.dimensions.width}x${params.dimensions.height} '
      'fps=${params.encoding?.maxFramerate} '
      'bitrate=${params.encoding?.maxBitrate} audio=$captureScreenAudio',
    );
    final pub = await local.publishVideoTrack(
      videoTrack,
      publishOptions: config.publishOptions(
        sourceWidth: sourceWidth,
        sourceHeight: sourceHeight,
      ),
    );
    final videoSid = pub.sid;
    String? audioSid;
    if (captureScreenAudio) {
      for (final audio in audioTracks) {
        final audioPub = await local.publishAudioTrack(
          audio,
          publishOptions: const AudioPublishOptions(
            encoding: AudioEncoding.presetMusicHighQualityStereo,
          ),
        );
        audioSid ??= audioPub.sid;
      }
    } else {
      for (final audio in audioTracks) {
        try {
          await audio.mediaStreamTrack.stop();
        } catch (_) {}
      }
    }
    debugPrint(
      '[CommsMedia] screen share published: videoSid=$videoSid audioSid=$audioSid',
    );
    state = state.copyWith(
      activeScreenShareTrackSids: {
        ...state.activeScreenShareTrackSids,
        videoSid,
      },
      screenShareAudioSids: audioSid == null
          ? state.screenShareAudioSids
          : {...state.screenShareAudioSids, videoSid: audioSid},
      screenShareSourceIds: sourceId == null
          ? state.screenShareSourceIds
          : {...state.screenShareSourceIds, videoSid: sourceId},
      screenShareConfigs: {...state.screenShareConfigs, videoSid: config},
    );
    return videoSid;
  }

  /// Desktop only (needs an explicit source id).
  Future<bool> switchScreenShareSource(
    String trackSid,
    String newSourceId,
  ) async {
    final local = state.room?.localParticipant;
    if (local == null) return false;
    LocalVideoTrack? track;
    for (final pub in local.videoTrackPublications) {
      if (pub.sid == trackSid && pub.track is LocalVideoTrack) {
        track = pub.track as LocalVideoTrack;
      }
    }
    if (track == null || track.source != TrackSource.screenShareVideo) {
      return false;
    }
    final config =
        state.screenShareConfigs[trackSid] ?? const ScreenShareConfig();
    try {
      await track.restartTrack(
        config.captureOptions(
          sourceId: newSourceId,
          captureScreenAudio: false,
        ),
      );
      await track.replaceTrackForMultiCodecSimulcast(track.mediaStreamTrack);
      state = state.copyWith(
        screenShareSourceIds: {
          ...state.screenShareSourceIds,
          trackSid: newSourceId,
        },
      );
      return true;
    } catch (e) {
      debugPrint('[CommsController] Failed to switch share source: $e');
      return false;
    }
  }

  /// Toggles the audio of one active share.
  /// Turning off stops + unpublishes the audio track immediately.
  /// Turning on returns false when no audio track exists, the caller must
  /// recreate the share with audio (desktop) or re-pick (native picker).
  Future<bool> setScreenShareAudio(String trackSid, bool enabled) async {
    final local = state.room?.localParticipant;
    if (local == null) return false;
    if (!enabled) {
      final audioSid = state.screenShareAudioSids[trackSid];
      if (audioSid == null) return true;
      try {
        final audioPub = local.audioTrackPublications
            .where((p) => p.sid == audioSid)
            .firstOrNull;
        await audioPub?.track?.mediaStreamTrack.stop();
        await local.removePublishedTrack(audioSid);
      } catch (e) {
        debugPrint('[CommsController] Error stopping share audio: $e');
      }
      final updatedAudioSids = Map<String, String>.from(
        state.screenShareAudioSids,
      )..remove(trackSid);
      state = state.copyWith(screenShareAudioSids: updatedAudioSids);
      return true;
    }
    return state.screenShareAudioSids.containsKey(trackSid);
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
      final updatedSourceIds = Map<String, String>.from(
        state.screenShareSourceIds,
      )..remove(targetSid);
      final updatedConfigs = Map<String, ScreenShareConfig>.from(
        state.screenShareConfigs,
      )..remove(targetSid);
      state = state.copyWith(
        activeScreenShareTrackSids: updatedSids,
        screenShareAudioSids: updatedAudioSids,
        screenShareSourceIds: updatedSourceIds,
        screenShareConfigs: updatedConfigs,
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

  /// Locates the [RemoteTrackPublication] corresponding to [trackSid], if available.
  RemoteTrackPublication? findRemoteTrackPublication(String trackSid) {
    final room = state.room;
    if (room == null) return null;
    for (final participant in room.remoteParticipants.values) {
      for (final pub in participant.videoTrackPublications) {
        if (pub.sid == trackSid) return pub;
      }
    }
    return null;
  }

  /// Adjusts subscribed quality for remote screen share track [trackSid].
  /// [quality] may be 'auto', 'high', 'medium', or 'low'.
  Future<void> setRemoteScreenShareQuality(
    String trackSid,
    String quality,
  ) async {
    final pub = findRemoteTrackPublication(trackSid);
    if (pub != null) {
      final vq = switch (quality) {
        'low' => VideoQuality.LOW,
        'medium' => VideoQuality.MEDIUM,
        _ => VideoQuality.HIGH,
      };
      try {
        await pub.setVideoQuality(vq);
      } catch (e) {
        debugPrint('[CommsController] Failed to set remote video quality: $e');
      }
    }
    state = state.copyWith(
      remoteScreenShareQualities: {
        ...state.remoteScreenShareQualities,
        trackSid: quality,
      },
    );
  }
}
