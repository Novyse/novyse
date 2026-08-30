import 'package:socket_io_client/socket_io_client.dart' as io;

/// Handles sending events from the app to the Socket.IO server.
/// Equivalent to `eventSender` in the TypeScript codebase.
class EventSender {
  EventSender._();
  static final EventSender instance = EventSender._();

  io.Socket? _socket;

  void initialize(io.Socket socket) {
    _socket = socket;
  }

  /// Send a typing/recording activity indicator.
  void activity(String chatUUID, String action) {
    _socket?.emit(
      'chat:member:activity',
      {'chatUUID': chatUUID, 'action': action},
    );
  }
}

final eventSender = EventSender.instance;
