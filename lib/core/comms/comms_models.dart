import 'package:flutter/foundation.dart';
import 'package:livekit_client/livekit_client.dart';

/// Helper to extract clean userUUID from a LiveKit identity.
/// Backend identity format is typically `userUUID_sessionID` or `userUUID`.
String extractUserUUID(String identity) {
  if (identity.isEmpty) return '';
  final separatorIndex = identity.indexOf('_');
  if (separatorIndex != -1) {
    return identity.substring(0, separatorIndex);
  }
  return identity;
}

/// Represents a single visual tile in the Comms Members grid.
/// This can be either:
/// 1. A user's camera / avatar tile (`isScreenShare == false`)
/// 2. A specific screen share tile (`isScreenShare == true`)
@immutable
class CommsTileItem {
  /// Unique identifier for this tile.
  /// For user avatar/camera: participant's identity (userUUID + deviceID).
  /// For screen share: the track's SID.
  final String id;

  /// The UUID of the user owning this stream/tile.
  final String userUUID;

  /// True if this tile represents a screen share track.
  final bool isScreenShare;

  /// True if this tile belongs to the local participant.
  final bool isLocal;

  /// Active video track to render, if any.
  final VideoTrack? videoTrack;

  /// Track SID if this is a screen share.
  final String? trackSid;

  /// Whether this user is currently speaking (audio activity).
  final bool isSpeaking;

  /// Whether the user or track is locally or remotely muted.
  final bool isMuted;

  const CommsTileItem({
    required this.id,
    required this.userUUID,
    this.isScreenShare = false,
    this.isLocal = false,
    this.videoTrack,
    this.trackSid,
    this.isSpeaking = false,
    this.isMuted = false,
  });

  bool get hasActiveVideo => videoTrack != null && !videoTrack!.muted;

  CommsTileItem copyWith({
    String? id,
    String? userUUID,
    bool? isScreenShare,
    bool? isLocal,
    VideoTrack? videoTrack,
    String? trackSid,
    bool? isSpeaking,
    bool? isMuted,
  }) {
    return CommsTileItem(
      id: id ?? this.id,
      userUUID: userUUID ?? this.userUUID,
      isScreenShare: isScreenShare ?? this.isScreenShare,
      isLocal: isLocal ?? this.isLocal,
      videoTrack: videoTrack ?? this.videoTrack,
      trackSid: trackSid ?? this.trackSid,
      isSpeaking: isSpeaking ?? this.isSpeaking,
      isMuted: isMuted ?? this.isMuted,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CommsTileItem &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          userUUID == other.userUUID &&
          isScreenShare == other.isScreenShare &&
          isLocal == other.isLocal &&
          videoTrack == other.videoTrack &&
          trackSid == other.trackSid &&
          isSpeaking == other.isSpeaking &&
          isMuted == other.isMuted;

  @override
  int get hashCode => Object.hash(
    id,
    userUUID,
    isScreenShare,
    isLocal,
    videoTrack,
    trackSid,
    isSpeaking,
    isMuted,
  );
}

@immutable
class CommsRemoteScreenShare {
  /// UUID of the user owning the share.
  final String ownerUUID;

  /// Server-side track SID identifying this specific share.
  final String trackSid;

  const CommsRemoteScreenShare({
    required this.ownerUUID,
    required this.trackSid,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CommsRemoteScreenShare &&
          runtimeType == other.runtimeType &&
          ownerUUID == other.ownerUUID &&
          trackSid == other.trackSid;

  @override
  int get hashCode => Object.hash(ownerUUID, trackSid);
}

/// Data model representing the state of a room fetched from server REST API
/// (used when the client is NOT connected to this specific room).
@immutable
class CommsRoomRemoteData {
  final Map<String, dynamic>? roomInfo;
  final List<String> participantUserUUIDs;

  final List<CommsRemoteScreenShare> screenShares;

  const CommsRoomRemoteData({
    this.roomInfo,
    this.participantUserUUIDs = const [],
    this.screenShares = const [],
  });

  factory CommsRoomRemoteData.fromApi(
    dynamic rawRoom,
    dynamic rawParticipants,
  ) {
    Map<String, dynamic>? info;
    if (rawRoom is Map<String, dynamic>) {
      info = rawRoom;
    } else if (rawRoom is Map) {
      info = Map<String, dynamic>.from(rawRoom);
    }

    final userUUIDs = <String>[];
    final shares = <CommsRemoteScreenShare>[];

    void addParticipant(String uuid) {
      if (uuid.isNotEmpty && !userUUIDs.contains(uuid)) {
        userUUIDs.add(uuid);
      }
    }

    if (rawParticipants is List) {
      for (final p in rawParticipants) {
        if (p is Map) {
          final identity = _extractRemoteIdentity(p);
          if (identity.isNotEmpty) {
            final uuid = extractUserUUID(identity);
            addParticipant(uuid);
            for (final sid in _extractScreenShareSids(p)) {
              final share = CommsRemoteScreenShare(
                ownerUUID: uuid,
                trackSid: sid,
              );
              if (!shares.contains(share)) {
                shares.add(share);
              }
            }
          }
        } else if (p is String && p.isNotEmpty) {
          addParticipant(extractUserUUID(p));
        }
      }
    }

    return CommsRoomRemoteData(
      roomInfo: info,
      participantUserUUIDs: userUUIDs,
      screenShares: shares,
    );
  }
}

/// Extracts the participant identity from the various shapes returned by
/// `GET /comms/room`
String _extractRemoteIdentity(Map p) {
  final candidates = <dynamic>[
    p['identity'],
    p['userUUID'],
    p['uuid'],
    p['user_uuid'],
  ];
  for (final c in candidates) {
    if (c is String && c.isNotEmpty) return c;
  }
  // LiveKit-style nested info: { participantInfo: { identity: ... } }
  final info = p['participantInfo'];
  if (info is Map) {
    final nested = info['identity'];
    if (nested is String && nested.isNotEmpty) return nested;
  }
  // Some backends nest under `participant: {...}`.
  final nestedParticipant = p['participant'];
  if (nestedParticipant is Map) {
    return _extractRemoteIdentity(nestedParticipant);
  }
  return '';
}

/// Extracts screen-share track SIDs from a remote participant payload.
List<String> _extractScreenShareSids(Map p) {
  final rawTracks = p['tracks'];
  // Some payloads nest tracks under participantInfo.
  final nestedInfo = p['participantInfo'];
  final nestedTracks = nestedInfo is Map ? nestedInfo['tracks'] : null;
  final trackLists = <dynamic>[rawTracks, nestedTracks];

  final sids = <String>[];
  for (final trackList in trackLists) {
    if (trackList is! List) continue;
    for (final t in trackList) {
      if (t is! Map) continue;
      final sid = _extractTrackSid(t);
      if (sid.isEmpty || sids.contains(sid)) continue;
      if (_isScreenShareTrack(t)) {
        sids.add(sid);
      }
    }
  }
  return sids;
}

String _extractTrackSid(Map t) {
  for (final key in ['sid', 'trackSid', 'track_sid', 'id']) {
    final v = t[key];
    if (v is String && v.isNotEmpty) return v;
  }
  return '';
}

/// Heuristic matching LiveKit screen-share sources in both string
/// (`"SCREEN_SHARE"`) and numeric enum forms.
bool _isScreenShareTrack(Map t) {
  final source = t['source'];
  if (source is String) {
    final normalized = source.toUpperCase();
    if (normalized.contains('SCREEN')) return true;
    // livekit_client stringifies as e.g. "screenShareVideo".
    if (source.toLowerCase().contains('screenshare')) return true;
  } else if (source is int) {
    // LiveKit Track.Source enum: CAMERA=1, SCREEN_SHARE=2 (protobuf).
    // Only treat 2 as screen share to avoid false positives.
    if (source == 2) return true;
  }
  final name = t['name'];
  if (name is String) {
    final lower = name.toLowerCase();
    if (lower.contains('screen') && lower.contains('share')) return true;
  }
  final type = t['type'];
  // Explicit boolean flag used by some backends.
  if (t['isScreenShare'] == true && type != null) return true;
  return false;
}
