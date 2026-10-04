import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/auth/onboarding_manager.dart';
import 'package:novyse/core/auth/session_cleanup.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/router/router.dart';
import 'package:novyse/core/services/auth.dart';

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

  /// Guards against logout loops when multiple invalidSession events fire in quick succession.
  bool _handlingInvalidSession = false;
  DateTime? _lastInvalidSessionAt;
  static const _invalidSessionDebounce = Duration(seconds: 5);

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
        final now = DateTime.now();
        if (_handlingInvalidSession) {
          debugPrint(
            '[auth] InvalidSession ignored: logout already in progress',
          );
          return;
        }
        if (_lastInvalidSessionAt != null &&
            now.difference(_lastInvalidSessionAt!) < _invalidSessionDebounce) {
          debugPrint('[auth] InvalidSession ignored: debounced duplicate');
          return;
        }
        // Already logged out
        if (!ref.read(authProvider)) {
          debugPrint('[auth] InvalidSession ignored: already logged out');
          return;
        }
        _handlingInvalidSession = true;
        _lastInvalidSessionAt = now;
        debugPrint(
          'User session became invalid. Logging out and redirecting... 🍹',
        );
        // Try to refresh the token first, in case the invalidation was a false positive (e.g. network hiccup). If refresh fails, proceed to logout.
        try {
          final recovered = await auth.token.get(forceRefresh: true);
          if (recovered != null && recovered.isNotEmpty) {
            debugPrint(
              '[auth] InvalidSession aborted: refresh retry recovered a token',
            );
            _handlingInvalidSession = false;
            return;
          }
          debugPrint('[auth] InvalidSession confirmed: refresh retry empty');
        } catch (e) {
          debugPrint(
            '[auth] InvalidSession refresh retry error, proceeding: $e',
          );
        }
        try {
          await performLogout(ref);
        } catch (_) {}
        _handlingInvalidSession = false;
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
