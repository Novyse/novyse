import 'package:flutter/foundation.dart';

/// One `STATE` mutation of an activity.
///
/// `seq`, `sender` and `ts` are assigned by the gateway: the client never
/// trusts its own values, it replays what the log says.
@immutable
class ActivityEvent {
  const ActivityEvent({
    required this.seq,
    required this.sender,
    required this.ts,
    required this.type,
    this.data,
  });

  /// Sequence number assigned by the server, monotonic per activity.
  final int seq;

  /// Identity of the participant that sent the event, `userUUID_sessionID`.
  final String sender;

  /// Server time of the event in milliseconds.
  final int ts;

  /// Type of the mutation, upper case with underscores.
  final String type;

  /// Payload of the mutation, opaque to the host.
  final Object? data;

  factory ActivityEvent.fromJson(Map<String, dynamic> json) => ActivityEvent(
    seq: (json['seq'] as num?)?.toInt() ?? 0,
    sender: json['sender']?.toString() ?? '',
    ts: (json['ts'] as num?)?.toInt() ?? 0,
    type: json['type']?.toString() ?? '',
    data: json['data'],
  );

  /// The shape the plugin sees in `init().state.events`.
  Map<String, dynamic> toJson() => {
    'seq': seq,
    'sender': sender,
    'ts': ts,
    'type': type,
    if (data != null) 'data': data,
  };
}
