import 'dart:async';

import 'package:centrifuge/centrifuge.dart' as centrifuge;
import 'package:novyse/core/services/realtime/event_sender.dart';

/// Tears a realtime client down: cancels its listener subscriptions,
/// disconnects it and disables the sender, so no later publication lands
/// on a discarded connection. Safe to call with no live client: the
/// cleanup still happens.
void teardownClient(
  centrifuge.Client? client,
  List<StreamSubscription<dynamic>> listeners,
) {
  listeners
    ..forEach((listener) => listener.cancel())
    ..clear();
  eventSender.reset();
  if (client == null) return;
  unawaited(client.disconnect());
}
