import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/onboarding_manager.dart';
import '../../pages/app/home.dart';
import '../../pages/onboarding/login.dart';
import '../../pages/onboarding/signup.dart';
import '../../pages/onboarding/welcome.dart';
import '../../pages/update_required.dart';

/// Global application GoRouter provider with authentication guard.
final routerProvider = Provider<GoRouter>((ref) {
  final isLoggedIn = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/welcome',
    redirect: (BuildContext context, GoRouterState state) {
      final isOnUpdateRequiredPage = state.matchedLocation == '/updateRequired';
      if (isOnUpdateRequiredPage) return null;

      final isOnWelcomePage = state.matchedLocation == '/welcome';
      final isOnLoginPage = state.matchedLocation == '/login';
      final isOnSignupPage = state.matchedLocation == '/signup';

      if (!isLoggedIn &&
          !isOnWelcomePage &&
          !isOnLoginPage &&
          !isOnSignupPage) {
        return '/welcome';
      }

      if (isLoggedIn && (isOnWelcomePage || isOnLoginPage || isOnSignupPage)) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/welcome',
        builder: (context, state) => const WelcomePage(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) {
          final signedUpParam =
              state.uri.queryParameters['signedup']?.toLowerCase() ??
              state.uri.queryParameters['signedUp']?.toLowerCase();
          final isSignedUp = signedUpParam == 'true';

          return LoginPage(
            key: ValueKey(
              '${state.uri.queryParameters['username']}_$isSignedUp',
            ),
            initialUsername: state.uri.queryParameters['username'],
            isSignedUp: isSignedUp,
          );
        },
      ),
      GoRoute(path: '/signup', builder: (context, state) => const SignupPage()),
      GoRoute(path: '/home', builder: (context, state) => const HomePage()),
      GoRoute(
        path: '/updateRequired',
        builder: (context, state) => UpdateRequiredPage(
          minVersion: state.uri.queryParameters['minVersion'],
        ),
      ),
    ],
  );
});
