import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart' show Helper;
import 'package:livekit_client/livekit_client.dart';

abstract final class CommsAudio {
  /// Linear volume key for a tile.
  static String volKeyForTile({
    required String id,
    required bool isScreenShare,
    required String? trackSid,
  }) {
    if (isScreenShare) return trackSid ?? id;
    return id;
  }

  /// Linear volume key for a remote audio publication.
  static String volKeyForPublication(
    Participant participant,
    TrackPublication pub,
  ) {
    if (pub.source == TrackSource.screenShareAudio) {
      final screenVideoPub = participant.getTrackPublicationBySource(
        TrackSource.screenShareVideo,
      );
      if (screenVideoPub != null) return screenVideoPub.sid;
      return pub.sid;
    }
    return participant.identity;
  }

  static double clamp01(double value) {
    if (value.isNaN) return 1.0;
    return value.clamp(0.0, 1.0);
  }

  /// Parse the persisted `comms.remoteVolumes` settings value back into a
  /// linear volume map.
  static Map<String, double> parsePersistedVolumes(Object? raw) {
    try {
      final decoded = raw is String ? jsonDecode(raw) : raw;
      if (decoded is! Map) return {};
      final result = <String, double>{};
      decoded.forEach((key, value) {
        if (key is! String || key.isEmpty) return;
        final numeric = value is num
            ? value.toDouble()
            : double.tryParse(value.toString());
        if (numeric == null || numeric.isNaN) return;
        result[key] = numeric.clamp(0.0, 1.0);
      });
      return result;
    } catch (_) {
      return {};
    }
  }

  /// Effective audible gain: local mute and global deafen force silence.
  static double effectiveVolume({
    required double volume,
    required bool locallyMuted,
    required bool outputEnabled,
  }) {
    if (locallyMuted || !outputEnabled) return 0.0;
    return clamp01(volume);
  }

  /// Apply [target] gain to a single remote audio track.
  ///
  /// Uses `flutter_webrtc Helper.setVolume` (works on native via
  /// MethodChannel and on web via `applyConstraints({volume})`).
  /// Falls back to `disable/enable` so mute always works even when the
  /// platform ignores the gain value.
  static Future<void> applyToTrack(Track? track, double target) async {
    if (track == null) return;
    final volume = clamp01(target);
    try {
      final mediaTrack = track.mediaStreamTrack;
      await Helper.setVolume(volume, mediaTrack);
    } catch (e) {
      debugPrint('[CommsAudio] setVolume failed: $e');
    }
    try {
      if (volume <= 0.0) {
        await track.disable();
      } else {
        await track.enable();
      }
    } catch (e) {
      debugPrint('[CommsAudio] enable/disable failed: $e');
    }
  }

  /// Apply stored volume/mute to every audio publication matching [volKey].
  static Future<void> applyToRoom({
    required Room? room,
    required String volKey,
    required Map<String, double> volumes,
    required Map<String, bool> muted,
    required bool outputEnabled,
  }) async {
    if (room == null) return;
    final target = effectiveVolume(
      volume: volumes[volKey] ?? 1.0,
      locallyMuted: muted[volKey] ?? false,
      outputEnabled: outputEnabled,
    );
    for (final participant in room.remoteParticipants.values) {
      for (final pub in participant.audioTrackPublications) {
        if (volKeyForPublication(participant, pub) != volKey) continue;
        await applyToTrack(pub.track, target);
      }
    }
  }

  /// Re-apply every stored volume (used on subscribe + deafen toggle).
  static Future<void> applyAll({
    required Room? room,
    required Map<String, double> volumes,
    required Map<String, bool> muted,
    required bool outputEnabled,
  }) async {
    if (room == null) return;
    for (final participant in room.remoteParticipants.values) {
      for (final pub in participant.audioTrackPublications) {
        final key = volKeyForPublication(participant, pub);
        final target = effectiveVolume(
          volume: volumes[key] ?? 1.0,
          locallyMuted: muted[key] ?? false,
          outputEnabled: outputEnabled,
        );
        await applyToTrack(pub.track, target);
      }
    }
  }
}
