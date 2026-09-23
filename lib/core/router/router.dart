import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/onboarding_manager.dart';
import '../../pages/app/chat_detail_page.dart';
import '../../pages/app/chat_favorites_page.dart';
import '../../pages/app/chat_overview_page.dart';
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
      ShellRoute(
        navigatorKey: shellNavigatorKey,
        builder: (context, state, child) => HomeShell(detailNavigator: child),
        routes: [
          GoRoute(path: '/chats', pageBuilder: (c, s) => _placeholderPage(s)),
          GoRoute(
            path: '/chats/:chatUUID',
            redirect: (context, state) {
              final chatUUID = state.pathParameters['chatUUID'] ?? '';
              final querySuffix = state.uri.query.isEmpty
                  ? ''
                  : '?${state.uri.query}';
              return '/chats/$chatUUID/0$querySuffix';
            },
          ),
          GoRoute(
            path: '/chats/:chatUUID/overview',
            redirect: (context, state) {
              final chatUUID = state.pathParameters['chatUUID'] ?? '';
              final querySuffix = state.uri.query.isEmpty
                  ? ''
                  : '?${state.uri.query}';
              return '/chats/$chatUUID/0/overview$querySuffix';
            },
          ),
          GoRoute(
            path: '/chats/:chatUUID/:subID',
            redirect: (context, state) {
              final subRaw = state.pathParameters['subID'] ?? '';
              if (int.tryParse(subRaw) == null) {
                final chatUUID = state.pathParameters['chatUUID'] ?? '';
                final suffix = state.uri.path.endsWith('/overview')
                    ? '/overview'
                    : '';
                final querySuffix = state.uri.query.isEmpty
                    ? ''
                    : '?${state.uri.query}';
                return '/chats/$chatUUID/0$suffix$querySuffix';
              }
              return null;
            },
            pageBuilder: (context, state) {
              final chatUUID = state.pathParameters['chatUUID'] ?? '';
              final subID =
                  int.tryParse(state.pathParameters['subID'] ?? '') ?? 0;
              return _chatStackPage(
                state,
                ChatDetailPage(chatUUID: chatUUID, subID: subID),
              );
            },
            routes: [
              GoRoute(
                path: 'overview',
                pageBuilder: (context, state) {
                  final chatUUID = state.pathParameters['chatUUID'] ?? '';
                  final subID =
                      int.tryParse(state.pathParameters['subID'] ?? '') ?? 0;
                  return _chatStackPage(
                    state,
                    ChatOverviewPage(chatUUID: chatUUID, subID: subID),
                  );
                },
                routes: [
                  GoRoute(
                    path: 'favorites',
                    pageBuilder: (context, state) {
                      final chatUUID = state.pathParameters['chatUUID'] ?? '';
                      final subID =
                          int.tryParse(state.pathParameters['subID'] ?? '') ??
                          0;
                      return _chatStackPage(
                        state,
                        ChatFavoritesPage(chatUUID: chatUUID, subID: subID),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: '/settings',
            pageBuilder: (c, s) => _placeholderPage(s),
          ),
          GoRoute(path: '/profile', pageBuilder: (c, s) => _placeholderPage(s)),
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
