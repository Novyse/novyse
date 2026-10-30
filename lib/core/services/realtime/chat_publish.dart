import 'dart:convert';

import 'package:centrifuge/centrifuge.dart' as centrifuge;
import 'package:flutter/foundation.dart' show debugPrint;

/// Publishes an app-to-server event on the `chat:<chatUUID>` channel of the
/// chats the server subscribed the [client] to.
///
/// The client-level publish goes over the connection; the server validates
/// the chat, rewrites `userUUID` with the authenticated identity and rate
/// limits per connection. A not-connected [client], an unsubscribe in
/// between or a server rejection land in the log: publishing a chat event
/// is best effort (the next attempt re-applies the state).
Future<void> publishOnChat(
  centrifuge.Client? client,
  String chatUUID,
  Map<String, dynamic> data,
) async {
  if (client == null) {
    debugPrint('Cannot publish on chat:$chatUUID: not connected');
    return;
  }
  try {
    await client.publish('chat:$chatUUID', utf8.encode(jsonEncode(data)));
  } catch (error) {
    debugPrint('Publish on chat:$chatUUID failed: $error');
  }
}
