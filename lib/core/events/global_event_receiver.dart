import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/auth/onboarding_manager.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/router/router.dart';
import 'package:novyse/core/services/auth.dart';
import 'package:novyse/core/services/socket_service.dart';
import 'package:novyse/core/services/sync_service.dart';

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

    // Bind auth invalid session callback to global event bus
    initAuth(bus);

    // invalidSession event
    _subscriptions.add(
      bus.on<InvalidSessionEvent>().listen((_) async {
        debugPrint(
          'User session became invalid. Logging out and redirecting... 🍹',
        );
        // Stop anything that would hit the API with an invalid token,
        // otherwise sync/socket retries loop with 401s after logout.
        try {
          ref.read(syncServiceProvider).cancelRetry();
        } catch (_) {}
        try {
          ref.read(socketServiceProvider).close();
        } catch (_) {}
        await onboardingManager.logout();
        if (mounted) {
          ref.read(routerProvider).go('/welcome');
        }
      }),
    );

    // clientUpdateRequired event
    _subscriptions.add(
      bus.on<ClientUpdateRequiredEvent>().listen((event) {
        debugPrint(
          'Client update required. Redirecting... 🚀 ${event.minVersion}',
        );
        final query = event.minVersion != null
            ? '?minVersion=${Uri.encodeComponent(event.minVersion!)}'
            : '';
        ref.read(routerProvider).go('/updateRequired$query');
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
