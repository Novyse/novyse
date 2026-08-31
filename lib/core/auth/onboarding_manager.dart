import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:novyse_auth/novyse_auth.dart' show NovyseAuth;

import '../services/api_gateway.dart';
import '../services/auth.dart' as auth_service;

/// Onboarding and session lifecycle manager.
/// Directly interfaces with Novyse Authentication backend and API Gateway.
class OnboardingManager {
  OnboardingManager();

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  NovyseAuth get _auth => auth_service.auth;

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
    } catch (_) {}
  }

  /// Clear all stored session markers and log out.
  Future<void> logout() async {
    try {
      await _auth.logout();
      await _storage.delete(key: 'userUUID');
      await _storage.delete(key: 'sessionID');
      await _storage.delete(key: 'sessionId');
      await _storage.delete(key: 'init');
    } catch (_) {}
  }

  /// Verify availability of a handle/username via API Gateway.
  Future<({bool success, bool? available})> checkHandleAvailability(
    String handle, {
    required Gateway gateway,
  }) async {
    try {
      return await gateway.check.handle(handle);
    } catch (_) {
      return (success: false, available: null);
    }
  }

  /// Sign in with credentials and required Cloudflare Turnstile token.
  /// `{ success: true, userUUID: string, sessionID: number, session_id: string, token: string }`
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
  /// `{ success: true }`
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
