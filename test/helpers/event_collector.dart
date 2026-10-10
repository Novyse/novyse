import 'dart:async';

import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/global_event_emitter.dart';

/// Collects everything published on the global [EventBus] while a test runs,
/// plus anything broadcast through [GlobalEventEmitter.emit].
///
/// `EventBus.on<T>()` filters with `event is T`, so subscribing as
/// `on<dynamic>()` yields the unfiltered stream — which is what lets a single
/// collector observe every event type a socket handler produces.
///
/// The two channels are distinct: typed events go on the [EventBus], while
/// `GlobalEventEmitter.emit(name, data)` only reaches listeners registered with
/// `GlobalEventEmitter.on(name, ...)` and never touches the bus. Some producers
/// (e.g. `ChatQueueProcessor.cancelFileTransfer`) use the latter, so a
/// collector that only watches the bus would miss them.
class EventCollector {
  EventCollector._(
    this._busSubscription,
    this._named,
    this._emitter,
    this.events,
  );

  /// Starts collecting. Call [stop] in `tearDown`.
  factory EventCollector.start({
    List<String> namedEvents = const [],
    GlobalEventEmitter? emitter,
  }) {
    final events = <dynamic>[];
    final target = emitter ?? GlobalEventEmitter.instance;
    final named = <(String, void Function(dynamic))>[];

    for (final name in namedEvents) {
      void listener(dynamic data) =>
          events.add(<String, dynamic>{'__named__': name, 'payload': data});
      named.add((name, listener));
      target.on(name, listener);
    }

    return EventCollector._(
      EventBus.instance.on<dynamic>().listen(events.add),
      named,
      target,
      events,
    );
  }

  final StreamSubscription<dynamic> _busSubscription;
  final List<(String, void Function(dynamic))> _named;
  final GlobalEventEmitter? _emitter;

  /// Everything seen, in emission order.
  final List<dynamic> events;

  /// Every collected [EventBus] event of type [T].
  List<T> ofType<T>() => events.whereType<T>().toList();

  /// The single collected [EventBus] event of type [T].
  T single<T>() => ofType<T>().single;

  /// The payloads broadcast on the named emitter event [name].
  List<dynamic> named(String name) => events
      .whereType<Map<String, dynamic>>()
      .where((e) => e['__named__'] == name)
      .map((e) => e['payload'])
      .toList();

  /// The single payload broadcast on the named emitter event [name].
  dynamic singleNamed(String name) => named(name).single;

  /// Waits for pending stream deliveries to be processed.
  Future<void> settle() =>
      Future<void>.delayed(const Duration(milliseconds: 20));

  Future<void> stop() async {
    await _busSubscription.cancel();
    for (final (name, listener) in _named) {
      (_emitter ?? GlobalEventEmitter.instance).off(name, listener);
    }
    _named.clear();
  }
}
