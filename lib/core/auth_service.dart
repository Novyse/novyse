import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../pages/app/home.dart';
import '../pages/onboarding/login.dart';
import '../pages/onboarding/signup.dart';
import '../pages/onboarding/welcome.dart';

class AuthController extends StateNotifier<bool> {
  AuthController() : super(false);

  void login() => state = true;
  void logout() => state = false;
}

final authProvider = StateNotifierProvider<AuthController, bool>(
  (ref) => AuthController(),
);

final appRouterProvider = Provider<GoRouter>((ref) {
  final isLoggedIn = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/welcome',
    redirect: (BuildContext context, GoRouterState state) {
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
      GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
      GoRoute(path: '/signup', builder: (context, state) => const SignupPage()),
      GoRoute(path: '/home', builder: (context, state) => const HomePage()),
    ],
  );
});
