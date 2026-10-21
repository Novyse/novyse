import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:flutter_webrtc/src/native/desktop_capturer_impl.dart';

/// Thumbnail loading for desktop screen/window sources.
abstract final class ScreenShareThumbnails {
  static const int _maxCacheEntries = 64;
  static final Map<String, Uint8List> _cache = <String, Uint8List>{};

  static void _store(String id, Uint8List bytes) {
    _cache.remove(id);
    _cache[id] = bytes;
    while (_cache.length > _maxCacheEntries) {
      _cache.remove(_cache.keys.first);
    }
  }

  /// Re-attaches cached bytes to freshly listed sources (and caches any
  /// bytes the plugin did provide). Call before the first setState so the
  /// grid paints with thumbnails immediately instead of flashing placeholders.
  static void primeFromCache(List<DesktopCapturerSource> sources) {
    for (final s in sources) {
      if (s is! DesktopCapturerSourceNative) continue;
      final current = s.thumbnail;
      if (current != null && current.isNotEmpty) {
        _store(s.id, current);
      } else {
        final bytes = _cache[s.id];
        if (bytes != null) s.thumbnail = bytes;
      }
    }
  }

  /// Fetches thumbnails for every source still missing one, calling
  /// [onChanged] as each arrives so the grid fills in progressively.
  /// Retries once: native single-frame capture can transiently fail
  /// (minimized/occluded windows). Never throws.
  static Future<void> fetchMissing(
    List<DesktopCapturerSource> sources, {
    void Function()? onChanged,
  }) async {
    final capturer = desktopCapturer;
    if (capturer is! DesktopCapturerNative) return;
    for (var attempt = 0; attempt < 2; attempt++) {
      final missing = <DesktopCapturerSourceNative>[];
      for (final s in sources) {
        if (s is DesktopCapturerSourceNative &&
            (s.thumbnail == null || s.thumbnail!.isEmpty)) {
          missing.add(s);
        }
      }
      if (missing.isEmpty) return;
      if (attempt > 0) {
        await Future.delayed(const Duration(milliseconds: 300));
      }
      await Future.wait(
        missing.map((s) async {
          try {
            final bytes = await capturer.getThumbnail(s);
            if (bytes == null || bytes.isEmpty) return;
            s.thumbnail = bytes;
            _store(s.id, bytes);
            onChanged?.call();
          } catch (_) {
            // Leave the placeholder for this source; retried above.
          }
        }),
      );
    }
  }

  /// Live thumbnail refreshes pushed by the plugin. The event payload
  /// already carries the new bytes (applied by the plugin itself), so
  /// listeners only re-cache and repaint. Returns null on platforms
  /// without desktop capture (web impl throws). Only call this on the
  /// custom-picker flow (Windows/macOS/X11 Linux).
  static StreamSubscription<DesktopCapturerSource>? listen(
    void Function() onChanged,
  ) {
    try {
      return desktopCapturer.onThumbnailChanged.stream.listen((source) {
        final bytes = source.thumbnail;
        if (bytes != null && bytes.isNotEmpty) {
          _store(source.id, bytes);
        }
        onChanged();
      });
    } catch (_) {
      return null;
    }
  }
}
