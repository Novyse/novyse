import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:novyse/ui/components/comms/screen_share_thumbnails_fetch.dart';

/// Thumbnail state for desktop screen/window sources: this module owns the
/// bytes and keys them by source id. The captures the plugin keeps on its
/// own source objects do not survive a re-listing, so the UI never relies
/// on them: it reads through [thumbnailFor] and updates through
/// [remember], [fetchMissing] and [listen].
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

  /// The cached bytes of the source with this id, whatever listing they
  /// came from. Null when no thumbnail is known for it.
  static Uint8List? thumbnailFor(String id) => _cache[id];

  /// Adopts the bytes the plugin provided along its listing into the
  /// cache. Call right after [DesktopCapturer.getSources] so paint falls
  /// back on known bytes immediately instead of flashing placeholders.
  static void remember(List<DesktopCapturerSource> sources) {
    for (final s in sources) {
      final current = s.thumbnail;
      if (current != null && current.isNotEmpty) {
        _store(s.id, current);
      }
    }
  }

  /// Fetches thumbnails for every source whose own capture is missing,
  /// calling [onChanged] as each arrival lands so the grid fills in
  /// progressively. Retries once per source: native single-frame capture
  /// can transiently fail (minimized/occluded windows). Never throws.
  static Future<void> fetchMissing(
    List<DesktopCapturerSource> sources, {
    void Function()? onChanged,
  }) async {
    if (!hasNativeDesktopCapturer) return;
    final pending = sources
        .where((s) => s.thumbnail == null || s.thumbnail!.isEmpty)
        .toList();
    for (var attempt = 0; attempt < 2 && pending.isNotEmpty; attempt++) {
      if (attempt > 0) {
        await Future.delayed(const Duration(milliseconds: 300));
      }
      await Future.wait(
        pending.map((s) async {
          final bytes = await fetchDesktopSourceThumbnail(s);
          if (bytes == null || bytes.isEmpty) {
            // Leave the placeholder for this source; retried above.
            return;
          }
          _store(s.id, bytes);
          pending.remove(s);
          onChanged?.call();
        }),
      );
    }
  }

  /// Live thumbnail refreshes pushed by the plugin. The event payload
  /// carries the new bytes on the source object (applied by the plugin
  /// itself), so listeners only re-cache and repaint. Returns null on
  /// platforms without desktop capture (web impl throws). Only call this
  /// on the custom-picker flow (Windows/macOS/X11 Linux).
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
