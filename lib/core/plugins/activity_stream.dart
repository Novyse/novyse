import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/plugins/bridge/bridge_protocol.dart';
import 'package:novyse/core/plugins/plugin_exception.dart';

/// The `STREAM` channel of an activity: LiveKit data packets, lossy.
///
/// It exists so a plugin that produces a lot of packets (a game at 60 Hz, a
/// cursor, a live stroke) does not flood the realtime channel. Packets go
/// straight through the SFU to the other participants of the room and are
/// never stored, so a late joiner starts from the snapshot alone.
///
/// One topic per activity (`act.<instanceId>`): the room can run three of them
/// and each plugin only sees its own traffic.
class ActivityStream {
  ActivityStream({
    required this.instanceId,
    required this.room,
    required this.onPacket,
  });

  final String instanceId;

  /// The LiveKit room, `null` while the call is not connected.
  final Room? Function() room;

  /// Receives a packet: identity of the sender and its bytes.
  final void Function(String sender, Uint8List bytes) onPacket;

  EventsListener<RoomEvent>? _listener;
  Room? _bound;

  /// Topic of this activity.
  static String topicFor(String instanceId) => 'act.$instanceId';

  /// Starts listening on the current room, rebinding when it changes.
  void bind() {
    final current = room();
    if (current == null || identical(current, _bound)) return;

    unbind();

    _bound = current;
    _listener = current.createListener()
      ..on<DataReceivedEvent>(_onDataReceived);
  }

  /// Sends a packet to the other participants.
  ///
  /// Throws [PluginCacheException] with `E_TOO_LARGE` when the payload is
  /// over the ceiling: a plugin must send deltas, never the whole world.
  Future<void> send(Uint8List bytes) async {
    if (bytes.length > BridgeProtocol.maxStreamBytes) {
      throw const PluginCacheException(
        'E_TOO_LARGE',
        'The stream packet is over 8 KiB',
      );
    }

    final current = room();
    final participant = current?.localParticipant;
    if (current == null || participant == null) return;

    await participant.publishData(
      bytes,
      reliable: false,
      topic: topicFor(instanceId),
    );
  }

  /// Stops listening. The room stays untouched.
  void unbind() {
    try {
      _listener?.dispose();
    } catch (_) {}

    _listener = null;
    _bound = null;
  }

  void _onDataReceived(DataReceivedEvent event) {
    if (event.topic != topicFor(instanceId)) return;

    final sender = event.participant?.identity;
    if (sender == null || sender.isEmpty) return;

    onPacket(sender, Uint8List.fromList(event.data));
  }

  /// Releases the listener.
  Future<void> dispose() async => unbind();

  /// Debug helper: the payload of a packet, when it is text.
  @visibleForTesting
  static String? decodeText(Uint8List bytes) {
    try {
      return String.fromCharCodes(bytes);
    } catch (_) {
      return null;
    }
  }
}
