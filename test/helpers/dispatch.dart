import 'dart:convert';

import 'package:novyse/core/services/realtime/event_receiver.dart';

/// Dispatches a simulated server event straight to the [EventReceiver],
/// exactly the way a realtime publication reaches it: the receiver only
/// sees the channel data — see [dispatchPublication] and
/// [dispatchRawPublication] — or an already-unwrapped `(event, payload)`
/// pair, so the tests exercise both receiver entry points.
void dispatchEvent(String event, [Object? payload]) {
  EventReceiver.instance.handleEvent(event, payload);
}

/// Dispatches a simulated publication of [channel]: [envelope] is the
/// `{event, payload}` envelope the publication data carries.
void dispatchPublication(String channel, Map<String, dynamic> envelope) {
  EventReceiver.instance.handlePublication(
    channel,
    utf8.encode(jsonEncode(envelope)),
  );
}

/// Dispatches a publication whose data is raw bytes, e.g. an undecodable
/// payload or a non-map envelope.
void dispatchRawPublication(String channel, List<int> data) {
  EventReceiver.instance.handlePublication(channel, data);
}
