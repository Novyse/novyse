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

/// Data model representing the state of a room fetched from server REST API
/// (used when the client is NOT connected to this specific room).
@immutable
class CommsRoomRemoteData {
  final Map<String, dynamic>? roomInfo;
  final List<String> participantUserUUIDs;

  const CommsRoomRemoteData({
    this.roomInfo,
    this.participantUserUUIDs = const [],
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
    if (rawParticipants is List) {
      for (final p in rawParticipants) {
        if (p is Map) {
          final identity = (p['identity'] ?? p['userUUID'] ?? '').toString();
          if (identity.isNotEmpty) {
            final uuid = extractUserUUID(identity);
            if (!userUUIDs.contains(uuid)) {
              userUUIDs.add(uuid);
            }
          }
        } else if (p is String && p.isNotEmpty) {
          final uuid = extractUserUUID(p);
          if (!userUUIDs.contains(uuid)) {
            userUUIDs.add(uuid);
          }
        }
      }
    }

    return CommsRoomRemoteData(roomInfo: info, participantUserUUIDs: userUUIDs);
  }
}
