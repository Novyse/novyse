import 'package:media_kit/media_kit.dart';

/// MediaKit pulls in a native mpv backend, so it is initialised lazily on the
/// first video instead of at startup. Safe to call from any number of widgets.
class MediaKitInitializer {
  const MediaKitInitializer._();

  static bool _initialized = false;

  static bool get isInitialized => _initialized;

  /// Returns true the first time it runs, false on every later call.
  static bool ensureInitialized() {
    if (_initialized) return false;
    MediaKit.ensureInitialized();
    _initialized = true;
    return true;
  }
}
