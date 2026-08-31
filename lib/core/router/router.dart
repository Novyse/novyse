import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/onboarding_manager.dart';
import '../../pages/app/chat_detail_page.dart';
import '../../pages/app/chat_info_page.dart';
import '../../pages/app/main_shell.dart';
import '../../pages/onboarding/login.dart';
import '../../pages/onboarding/signup.dart';
import '../../pages/onboarding/welcome.dart';
import '../../pages/update_required.dart';
import 'navigator_keys.dart';

Page<void> _placeholderPage(GoRouterState state) {
  return NoTransitionPage<void>(
    key: state.pageKey,
    child: const EmptyDetailPane(),
  );
}

Page<void> _chatStackPage(GoRouterState state, Widget child) {
  return MaterialPage<void>(
    key: state.pageKey,
    name: state.uri.path,
    child: child,
  );
}

/// Global application GoRouter provider with authentication guard.
final routerProvider = Provider<GoRouter>((ref) {
  final isLoggedIn = ref.watch(authProvider);

  // push/pop must update the browser URL (default is false).
  GoRouter.optionURLReflectsImperativeAPIs = true;

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/welcome',
    redirect: (BuildContext context, GoRouterState state) {
      final location = state.uri.path;
      final isOnUpdateRequiredPage = state.matchedLocation == '/updateRequired';
      if (isOnUpdateRequiredPage) return null;

      final isOnWelcomePage = location == '/welcome';
      final isOnLoginPage = location == '/login';
      final isOnSignupPage = location == '/signup';

      if (!isLoggedIn &&
          !isOnWelcomePage &&
          !isOnLoginPage &&
          !isOnSignupPage) {
        return '/welcome';
      }

      if (isLoggedIn && (isOnWelcomePage || isOnLoginPage || isOnSignupPage)) {
        return '/chats';
      }

      if (location == '/home' || location == '/home/chat') {
        return '/chats';
      }
      if (location.startsWith('/home/chat/')) {
        return location.replaceFirst('/home/chat/', '/chats/');
      }
      if (location == '/home/settings' ||
          location.startsWith('/home/settings/')) {
        return location.replaceFirst('/home/settings', '/settings');
      }
      if (location == '/home/profile' ||
          location.startsWith('/home/profile/')) {
        return location.replaceFirst('/home/profile', '/profile');
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
      GoRoute(path: '/home', redirect: (context, state) => '/chats'),
      ShellRoute(
        navigatorKey: shellNavigatorKey,
        builder: (context, state, child) => HomeShell(detailNavigator: child),
        routes: [
          GoRoute(path: '/chats', pageBuilder: (c, s) => _placeholderPage(s)),
          GoRoute(
            path: '/chats/:chatId',
            pageBuilder: (context, state) {
              final chatId = state.pathParameters['chatId'] ?? '';
              return _chatStackPage(state, ChatDetailPage(chatId: chatId));
            },
            routes: [
              GoRoute(
                path: 'info',
                pageBuilder: (context, state) {
                  final chatId = state.pathParameters['chatId'] ?? '';
                  return _chatStackPage(state, ChatInfoPage(chatId: chatId));
                },
              ),
              GoRoute(
                path: 'media',
                pageBuilder: (context, state) {
                  final chatId = state.pathParameters['chatId'] ?? '';
                  return _chatStackPage(state, ChatMediaPage(chatId: chatId));
                },
              ),
            ],
          ),
          GoRoute(
            path: '/settings',
            pageBuilder: (c, s) => _placeholderPage(s),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (c, s) => _placeholderPage(s),
          ),
        ],
      ),
      GoRoute(
        path: '/updateRequired',
        builder: (context, state) => UpdateRequiredPage(
          minVersion: state.uri.queryParameters['minVersion'],
        ),
      ),
    ],
  );
});
