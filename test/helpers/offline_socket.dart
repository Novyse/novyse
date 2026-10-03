import 'package:socket_io_client/socket_io_client.dart' as io;

/// A Socket.IO client that is wired up but never connects.
///
/// `SocketService` normally builds these from `io.io(...)`, which dials the
/// real server on construction. Disabling auto-connect gives us a socket whose
/// `emit` dispatches straight to the locally registered `on` handlers, which
/// is exactly what `EventReceiver.initialize` needs to be exercised.
class OfflineSocket {
  factory OfflineSocket() {
    final socket = io.io(
      'https://socket.invalid',
      io.OptionBuilder()
          .setTransports(<String>[])
          .disableAutoConnect()
          .enableForceNew()
          .build(),
    );
    return OfflineSocket._(socket);
  }

  OfflineSocket._(this.socket);

  final io.Socket socket;

  bool get connected => socket.connected;

  /// Simulates a server-sent [event] carrying [payload].
  ///
  /// `Socket.emit` builds an *outgoing* packet, so it never reaches local `on`
  /// handlers. Incoming traffic goes through `onevent`, which dispatches only
  /// while `connected` is true — hence the flag flip.
  void dispatch(String event, [Object? payload]) {
    socket.connected = true;
    socket.onevent(<String, dynamic>{
      'data': <dynamic>[event, payload],
    });
  }

  /// Tears the manager down so a test does not leak a transport.
  void close() {
    socket.connected = false;
    socket.io.close();
    socket.close();
  }
}
