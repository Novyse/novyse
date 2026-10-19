import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:media_kit/media_kit.dart';
import 'package:novyse/core/storage/file/file_storage.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/storage/file/playable_uri.dart';
import 'package:novyse/core/storage/file/web_blob_url.dart';
import 'package:novyse/core/utils/media_kit_initializer.dart';

/// Reads the duration of audio and video files.
class MediaDuration {
  MediaDuration._();

  /// Returns the duration in whole seconds, or `null` when [uri]/[bytes] do not
  /// point to a playable audio/video file or the container has no duration.
  static Future<int?> read({
    String? uri,
    Uint8List? bytes,
    String? name,
    String? mimeType,
  }) async {
    final fileName = name ?? '';
    final resolvedMime = getMimeType({
      'mimeType': mimeType ?? '',
      'name': fileName,
    });

    if (!isMediaFile(mimeType: resolvedMime, name: fileName)) return null;

    var source = normalizeMediaUri(uri);
    String? temporaryUri;

    if (source == null && uri != null && uri.isNotEmpty) {
      final resolved = await FileStorage.instance.read(uri, resolvedMime);
      if (resolved != null && resolved.isNotEmpty) {
        source = resolved;
        if (kIsWeb && resolved != uri) temporaryUri = resolved;
      }
    }

    if (source == null && bytes != null && bytes.isNotEmpty) {
      temporaryUri = createWebBlobUrl(bytes, resolvedMime);
      source = temporaryUri;
    }

    if (source == null || source.isEmpty) return null;

    try {
      return await _readDuration(source);
    } finally {
      revokeWebBlobUrl(temporaryUri);
    }
  }

  static Future<int?> _readDuration(String source) async {
    MediaKitInitializer.ensureInitialized();

    final player = Player();
    StreamSubscription<Duration>? durationSub;
    StreamSubscription<String>? errorSub;

    try {
      await player.setVolume(0);

      final completer = Completer<int?>();
      durationSub = player.stream.duration.listen((duration) {
        if (duration > Duration.zero && !completer.isCompleted) {
          completer.complete(duration.inSeconds);
        }
      });
      errorSub = player.stream.error.listen((_) {
        if (!completer.isCompleted) completer.complete(null);
      });

      await player.open(Media(source), play: false);

      final current = player.state.duration;
      if (current > Duration.zero && !completer.isCompleted) {
        completer.complete(current.inSeconds);
      }

      final seconds = await completer.future.timeout(
        const Duration(seconds: 6),
        onTimeout: () => null,
      );
      return seconds != null && seconds > 0 ? seconds : null;
    } catch (e) {
      debugPrint('[MediaDuration] read failed: $e');
      return null;
    } finally {
      await durationSub?.cancel();
      await errorSub?.cancel();
      await player.dispose();
    }
  }
}
