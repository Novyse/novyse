import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:novyse_auth/novyse_auth.dart' show NovyseAuth;

import '../services/api_gateway.dart';
import '../services/auth.dart' as auth_service;

/// Onboarding and session lifecycle manager.
/// Extends [StateNotifier<bool>] to be the single source of truth for auth state (true = logged in).
class OnboardingManager extends StateNotifier<bool> {
  OnboardingManager([super.state = false]);

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  NovyseAuth get _auth => auth_service.auth;

  /// Check saved credentials on app startup and initialize state.
  Future<bool> checkInitialSession() async {
    final loggedIn = await isLoggedIn();
    state = loggedIn;
    return loggedIn;
  }

  /// Check if the user is currently logged in based on session tokens.
  Future<bool> isLoggedIn() async {
    try {
      final token = await _auth.token.get();
      if (token != null && token.isNotEmpty) return true;

      final sessionId = await _storage.read(key: 'sessionId');
      final userUUID = await _storage.read(key: 'userUUID');
      return sessionId != null || userUUID != null;
    } catch (_) {
      return false;
    }
  }

  /// Retrieve the current user's UUID from local storage.
  Future<String?> getUserUUID() async {
    try {
      return await _storage.read(key: 'userUUID');
    } catch (_) {
      return null;
    }
  }

  /// Check whether the initial account sync has been completed.
  Future<bool> isInitialized() async {
    try {
      final initVal = await _storage.read(key: 'init');
      return initVal == 'true';
    } catch (_) {
      return false;
    }
  }

  /// Store session identifiers and mark user as logged in.
  Future<void> setLogin({
    String? userUUID,
    String? sessionID,
    String? sessionId,
  }) async {
    try {
      await _storage.write(key: 'init', value: 'false');
      if (userUUID != null) {
        await _storage.write(key: 'userUUID', value: userUUID);
      }
      if (sessionID != null) {
        await _storage.write(key: 'sessionID', value: sessionID);
      }
      final resolvedSessionId = sessionId ?? sessionID;
      if (resolvedSessionId != null) {
        await _storage.write(key: 'sessionId', value: resolvedSessionId);
      }
      state = true;
    } catch (_) {}
  }

  bool _isLoggingOut = false;

  /// Clear all stored session markers and log out.
  Future<void> logout() async {
    if (_isLoggingOut) return;
    _isLoggingOut = true;
    try {
      await _auth.logout();
      await _storage.delete(key: 'userUUID');
      await _storage.delete(key: 'sessionID');
      await _storage.delete(key: 'sessionId');
      await _storage.delete(key: 'init');
      await _storage.delete(key: 'localUserEventID');
    } catch (_) {}
    state = false;
    _isLoggingOut = false;
  }

  /// Verify availability of a handle/username via API Gateway.
  Future<({bool success, bool? available})> checkHandleAvailability(
    String handle,
  ) async {
    try {
      return await apiGateway.check.handle(handle);
    } catch (_) {
      return (success: false, available: null);
    }
  }

  /// Sign in with credentials and required Cloudflare Turnstile token.
  /// Sets internal logged in state only if API call succeeds.
  Future<({bool success, String? error, Map<String, dynamic>? data})> login({
    required String username,
    required String password,
    required String captchaToken,
  }) async {
    try {
      final res = await _auth.signin.signIn(
        username.trim().toLowerCase(),
        password,
        captchaToken,
      );

      if (res.success) {
        final data = res.data;
        if (data != null) {
          final userUUID = data['userUUID']?.toString();
          final sessionID = data['sessionID']?.toString();
          final sessionId = data['session_id']?.toString();

          await setLogin(
            userUUID: userUUID,
            sessionID: sessionID,
            sessionId: sessionId,
          );
        } else {
          state = true;
        }
        return (success: true, error: null, data: data);
      } else {
        return (
          success: false,
          error: res.error ?? 'Incorrect username or password',
          data: null,
        );
      }
    } catch (e) {
      return (success: false, error: e.toString(), data: null);
    }
  }

  /// Register new user with required Cloudflare Turnstile token and legal consent.
  Future<({bool success, String? error, Map<String, dynamic>? data})> signup({
    required String username,
    required String password,
    required String name,
    required String captchaToken,
    required bool acceptLegal,
    required bool isOldEnough,
  }) async {
    try {
      final res = await _auth.signup.signUp(
        username.trim().toLowerCase(),
        password,
        name.trim(),
        <String, dynamic>{
          'privacy': acceptLegal,
          'tos': acceptLegal,
          'isOver16': isOldEnough,
        },
        captchaToken,
      );

      if (res.success) {
        return (success: true, error: null, data: res.data);
      } else {
        return (
          success: false,
          error: res.error ?? 'Signup failed. Please try again.',
          data: null,
        );
      }
    } catch (e) {
      return (success: false, error: e.toString(), data: null);
    }
  }
}

/// Global [OnboardingManager] singleton.
final onboardingManager = OnboardingManager();

/// Global [authProvider] directly driven by [onboardingManager].
final authProvider = StateNotifierProvider<OnboardingManager, bool>(
  (ref) => onboardingManager,
);
