import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;
import 'package:flutter/services.dart';

import 'comms_fullscreen_stub.dart'
    if (dart.library.html) 'comms_fullscreen_web.dart' as webimpl;
import 'comms_fullscreen_io_stub.dart'
    if (dart.library.io) 'comms_fullscreen_io.dart' as ioimpl;

/// Platform-native fullscreen handling for a single comms tile.
abstract final class CommsFullscreen {
  static bool get _isDesktop {
    if (kIsWeb) return false;
    return switch (defaultTargetPlatform) {
      TargetPlatform.linux ||
      TargetPlatform.macOS ||
      TargetPlatform.windows =>
        true,
      _ => false,
    };
  }

  static bool get _isMobile {
    if (kIsWeb) return false;
    return switch (defaultTargetPlatform) {
      TargetPlatform.android || TargetPlatform.iOS => true,
      _ => false,
    };
  }

  /// Enter OS-level fullscreen. Safe to call on any platform (no-op on
  /// unsupported / test environments).
  static Future<void> enter() async {
    try {
      if (kIsWeb) {
        webimpl.webEnterFullscreen();
        return;
      }
      if (_isDesktop) {
        ioimpl.ioSetFullscreen(true);
        return;
      }
      if (_isMobile) {
        await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
        await SystemChrome.setPreferredOrientations(const [
          DeviceOrientation.landscapeLeft,
          DeviceOrientation.landscapeRight,
        ]);
      }
    } catch (_) {}
  }

  /// Exit OS-level fullscreen, restoring previous chrome/orientation.
  static Future<void> exit() async {
    try {
      if (kIsWeb) {
        webimpl.webExitFullscreen();
        return;
      }
      if (_isDesktop) {
        ioimpl.ioSetFullscreen(false);
        return;
      }
      if (_isMobile) {
        await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
        await SystemChrome.setPreferredOrientations(const [
          DeviceOrientation.portraitUp,
          DeviceOrientation.portraitDown,
          DeviceOrientation.landscapeLeft,
          DeviceOrientation.landscapeRight,
        ]);
      }
    } catch (_) {}
  }

  /// True while the browser holds any element in fullscreen.
  /// Only meaningful on web; always false elsewhere.
  static bool get isWebFullscreen {
    try {
      if (!kIsWeb) return false;
      return webimpl.webIsFullscreen();
    } catch (_) {
      return false;
    }
  }

  /// Listen for browser `fullscreenchange` (ESC exit). No-op off web.
  /// Returns a token to pass to [removeFullscreenChangeListener].
  static Object? addFullscreenChangeListener(void Function() callback) {
    try {
      if (!kIsWeb) return null;
      return webimpl.webAddFullscreenChangeListener(callback);
    } catch (_) {
      return null;
    }
  }

  static void removeFullscreenChangeListener(Object? token) {
    try {
      if (!kIsWeb || token == null) return;
      webimpl.webRemoveFullscreenChangeListener(token);
    } catch (_) {}
  }
}
