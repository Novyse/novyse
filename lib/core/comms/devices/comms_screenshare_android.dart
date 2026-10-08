import 'dart:io' as io;

import 'package:flutter/foundation.dart'
    show debugPrint, kIsWeb, visibleForTesting;
import 'package:flutter_background/flutter_background.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/l10n/l10n.dart';

/// Android MediaProjection foreground-service setup for screen share.
abstract final class CommsScreenshareAndroid {
  static bool get isAndroid => !kIsWeb && io.Platform.isAndroid;

  static FlutterBackgroundAndroidConfig _androidConfig() {
    final l10n = lookupAppL10n();
    return FlutterBackgroundAndroidConfig(
      notificationTitle: l10n.notifShareTitle,
      notificationText: l10n.notifShareText,
      notificationImportance: AndroidNotificationImportance.normal,
      notificationIcon: const AndroidResource(
        name: 'notification_icon',
        defType: 'drawable',
      ),
      shouldRequestBatteryOptimizationsOff: false,
    );
  }

  /// Runs permission dialog + FGS startup. Returns true when it is safe to
  /// call the LiveKit screen-capture APIs.
  static Future<bool> ensureProjectionReady({bool isRetry = false}) async {
    if (!isAndroid) return true;
    try {
      // ignore: experimental_member_use
      final granted = await Hardware.instance.requestCapturePermission();
      if (!granted) {
        debugPrint('[ScreenShare][Android] capture permission denied');
        return false;
      }
      return await _ensureBackgroundExecution(isRetry: isRetry);
    } catch (e) {
      debugPrint('[ScreenShare][Android] permission/FGS setup failed: $e');
      if (!isRetry) {
        await Future<void>.delayed(const Duration(seconds: 1));
        return ensureProjectionReady(isRetry: true);
      }
      return false;
    }
  }

  static Future<bool> _ensureBackgroundExecution({
    required bool isRetry,
  }) async {
    try {
      var hasPermissions = await FlutterBackground.hasPermissions;
      if (!isRetry) {
        hasPermissions = await FlutterBackground.initialize(
          androidConfig: _androidConfig(),
        );
      }
      if (hasPermissions &&
          !FlutterBackground.isBackgroundExecutionEnabled) {
        await FlutterBackground.enableBackgroundExecution();
      }
      debugPrint(
        '[ScreenShare][Android] FGS ready '
        '(hasPermissions=$hasPermissions '
        'enabled=${FlutterBackground.isBackgroundExecutionEnabled})',
      );
      return hasPermissions;
    } catch (e) {
      debugPrint('[ScreenShare][Android] FGS start failed: $e');
      if (!isRetry) {
        await Future<void>.delayed(const Duration(seconds: 1));
        return _ensureBackgroundExecution(isRetry: true);
      }
      return false;
    }
  }

  @visibleForTesting
  static Future<void> Function()? onTeardown;

  /// Best-effort teardown after stop/cancel. Never throws.
  static Future<void> teardownProjectionService() async {
    if (onTeardown != null) {
      await onTeardown!();
    }
    if (!isAndroid) return;
    try {
      if (FlutterBackground.isBackgroundExecutionEnabled) {
        await FlutterBackground.disableBackgroundExecution();
        debugPrint('[ScreenShare][Android] FGS disabled');
      }
    } catch (e) {
      debugPrint('[ScreenShare][Android] FGS teardown failed: $e');
    }
  }
}
