import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Application-wide event bus built on Dart's [StreamController.broadcast].
/// Events are strongly-typed classes defined in `events.dart`.
///
class EventBus {
  final _controller = StreamController<dynamic>.broadcast();

  /// Emit an event to all listeners of its type.
  void emit(dynamic event) {
    _controller.add(event);
  }

  /// Returns a stream filtered to events of type [T].
  Stream<T> on<T>() {
    return _controller.stream.where((event) => event is T).cast<T>();
  }

  /// Dispose the underlying controller. Call only on app shutdown.
  void dispose() {
    _controller.close();
  }
}

/// Riverpod provider for the global [EventBus].
final eventBusProvider = Provider<EventBus>((ref) {
  final bus = EventBus();
  ref.onDispose(() => bus.dispose());
  return bus;
});
