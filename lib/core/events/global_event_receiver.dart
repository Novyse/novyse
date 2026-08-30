import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';

/// Sets up global event listeners for navigation and critical app state changes.
/// Equivalent to `SetupGlobalEventReceiver` in the React/TypeScript codebase.
class GlobalEventReceiver extends ConsumerStatefulWidget {
  final Widget child;

  const GlobalEventReceiver({super.key, required this.child});

  @override
  ConsumerState<GlobalEventReceiver> createState() =>
      _GlobalEventReceiverState();
}

class _GlobalEventReceiverState extends ConsumerState<GlobalEventReceiver> {
  final List<StreamSubscription> _subscriptions = [];

  @override
  void initState() {
    super.initState();
    _setupListeners();
  }

  void _setupListeners() {
    final bus = ref.read(eventBusProvider);

    // invalidSession event
    _subscriptions.add(
      bus.on<InvalidSessionEvent>().listen((_) {
        debugPrint('User session became invalid. Taking action... 🍹');
        // TODO: Implement navigation/logout logic
        // e.g., auth.logout(router);
      }),
    );

    // clientUpdateRequired event
    _subscriptions.add(
      bus.on<ClientUpdateRequiredEvent>().listen((event) {
        debugPrint(
          'Client update required. Redirecting... 🚀 ${event.minVersion}',
        );
        // TODO: Implement navigation to updateRequired screen
        // e.g., router.replace('/updateRequired');
      }),
    );
  }

  @override
  void dispose() {
    for (final sub in _subscriptions) {
      sub.cancel();
    }
    _subscriptions.clear();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
