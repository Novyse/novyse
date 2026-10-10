import 'dart:io' show Directory, File;

import 'package:flutter/foundation.dart' show debugPrint, kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mime/mime.dart';
import 'package:novyse/core/share/incoming_share_store.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:receive_sharing_intent/receive_sharing_intent.dart';

/// Normalizes `receive_sharing_intent` payloads into [IncomingShareFile]s
/// and stores the pending share in [incomingShareProvider].
class IncomingShareService {
  const IncomingShareService._();

  /// Converts raw shared media into text + draft-ready files.
  static Future<({String text, List<IncomingShareFile> files})> normalize(
    List<SharedMediaFile> media,
  ) async {
    final texts = <String>[];
    final files = <IncomingShareFile>[];
    for (final item in media) {
      switch (item.type) {
        case SharedMediaType.text:
          if (item.path.trim().isNotEmpty) texts.add(item.path.trim());
          if ((item.message ?? '').trim().isNotEmpty) {
            texts.add(item.message!.trim());
          }
          break;
        case SharedMediaType.url:
          if (item.path.trim().isNotEmpty) texts.add(item.path.trim());
          if ((item.message ?? '').trim().isNotEmpty) {
            texts.add(item.message!.trim());
          }
          break;
        case SharedMediaType.image:
        case SharedMediaType.video:
        case SharedMediaType.file:
          final file = await copyToDraftCache(item);
          if (file != null) files.add(file);
          if ((item.message ?? '').trim().isNotEmpty) {
            texts.add(item.message!.trim());
          }
          break;
      }
    }
    return (text: texts.join('\n\n'), files: files);
  }

  /// Stores a normalized share as pending (no-op when empty).
  static void storePending(
    WidgetRef ref, {
    required String text,
    required List<IncomingShareFile> files,
  }) {
    if (text.trim().isEmpty && files.isEmpty) return;
    ref
        .read(incomingShareProvider.notifier)
        .setPending(text: text, files: files);
    debugPrint(
      '[IncomingShare] pending: text=${text.length} chars, files=${files.length}',
    );
  }

  /// Consumes the pending share: returns it and clears the holder.
  /// First opened chat absorbs it (consume-once).
  static IncomingShareState consumePending(WidgetRef ref) {
    final pending = ref.read(incomingShareProvider);
    ref.read(incomingShareProvider.notifier).clear();
    return pending;
  }

  /// Copies a shared file into the app cache dir with a safe name.
  /// Returns null when the source is missing/unreadable.
  static Future<IncomingShareFile?> copyToDraftCache(
    SharedMediaFile item,
  ) async {
    if (kIsWeb) return null;
    try {
      var sourcePath = item.path;
      if (sourcePath.startsWith('file://')) {
        sourcePath = Uri.parse(sourcePath).toFilePath();
      } else if (sourcePath.startsWith('content://')) {
        debugPrint('[IncomingShare] unsupported content URI: $sourcePath');
        return null;
      }
      final source = File(sourcePath);
      if (!await source.exists()) {
        debugPrint('[IncomingShare] source missing: $sourcePath');
        return null;
      }
      final stat = await source.stat();
      final mimeType =
          item.mimeType ??
          lookupMimeType(sourcePath) ??
          lookupMimeType(p.basename(sourcePath)) ??
          defaultMimeType;

      final cache = await getTemporaryDirectory();
      final dir = Directory(p.join(cache.path, 'novyse_incoming'));
      if (!await dir.exists()) await dir.create(recursive: true);
      final base = p.basename(sourcePath).isEmpty
          ? 'shared_${DateTime.now().millisecondsSinceEpoch}'
          : p.basename(sourcePath);
      final dest = File(
        p.join(dir.path, '${DateTime.now().millisecondsSinceEpoch}_$base'),
      );
      await source.copy(dest.path);
      return IncomingShareFile(
        name: base,
        path: dest.path,
        size: stat.size,
        mimeType: mimeType,
      );
    } catch (e) {
      debugPrint('[IncomingShare] copy failed: $e');
      return null;
    }
  }

  /// Builds draft-bar file maps from pending files.
  static List<Map<String, dynamic>> toDraftFiles(
    List<IncomingShareFile> files,
  ) {
    return [for (final f in files) f.toDraftMap()];
  }
}
