import 'dart:async';

import 'package:centrifuge/centrifuge.dart' as centrifuge;
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/services/auth.dart';

/// Builds the realtime connection.
///
/// The endpoint is websocket-only, and the connection is authenticated with
/// the same access token the API gateway accepts. The `getToken` callback is
/// the token lifecycle: the SDK asks for a fresh access token whenever a
/// handshake is refused or the connection TTL expires, and the server
/// validates the identity again on every handshake.
centrifuge.Client connectRealtime({required String accessToken}) {
  return centrifuge.createClient(
    config.realtimeBaseUrl,
    centrifuge.ClientConfig(
      token: accessToken,
      getToken: (event) async {
        final token = await auth.token.get();
        return token ?? '';
      },
    ),
  );
}

/// Subscribes the connection streams of [client] to the matching handlers.
///
/// Every handler runs only while [client] is still the current connection
/// of the caller ([isCurrent]), so late events of a discarded client are
/// dropped before they reach the handlers. The handlers must swallow their
/// own errors: an exception escaping a listener tears the connection down.
///
/// Returns the subscriptions: callers keep them to cancel when the client
/// is discarded.
List<StreamSubscription<dynamic>> bindClientEvents(
  centrifuge.Client client, {
  required bool Function() isCurrent,
  required void Function() onConnected,
  required void Function(centrifuge.DisconnectedEvent event) onDisconnected,
  required void Function(String channel, List<int> data) onPublication,
  required void Function(Object? error) onError,
}) {
  return [
    client.connected.listen((event) {
      if (!isCurrent()) return;
      onConnected();
    }),
    client.disconnected.listen((event) {
      if (!isCurrent()) return;
      onDisconnected(event);
    }),
    client.error.listen((event) {
      if (!isCurrent()) return;
      onError(event.error);
    }),
    client.subscribed.listen((event) {
      if (!isCurrent()) return;
      debugPrint('Realtime subscribed: ${event.channel}');
    }),
    client.unsubscribed.listen((event) {
      if (!isCurrent()) return;
      debugPrint('Realtime unsubscribed: ${event.channel}');
    }),
    client.publication.listen((event) {
      if (!isCurrent()) return;
      onPublication(event.channel, event.data);
    }),
  ];
}
