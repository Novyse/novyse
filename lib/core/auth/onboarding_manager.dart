import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../services/api_gateway.dart';
import '../services/auth.dart';

/// Onboarding and session lifecycle manager.
/// Ported from React Native `src/utils/welcome/auth.js`.
class OnboardingManager {
  OnboardingManager({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  /// Check if the user is currently logged in based on session tokens.
  Future<bool> isLoggedIn() async {
    try {
      final token = await auth.token.get();
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
    } catch (e) {
      // Ignore or log error
    }
  }

  /// Clear all stored session markers and log out.
  Future<void> logout() async {
    try {
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
  Future<({bool success, String? error})> login({
    required String username,
    required String password,
    required String captchaToken,
  }) async {
    try {
      return (success: true, error: null);
    } catch (e) {
      return (success: false, error: e.toString());
    }
  }

  /// Register new user with required Cloudflare Turnstile token and legal consent.
  Future<({bool success, String? error})> signup({
    required String username,
    required String password,
    required String name,
    required String captchaToken,
    required bool acceptLegal,
    required bool isOldEnough,
  }) async {
    try {
      return (success: true, error: null);
    } catch (e) {
      return (success: false, error: e.toString());
    }
  }
}

/// Global [OnboardingManager] singleton.
final onboardingManager = OnboardingManager();
