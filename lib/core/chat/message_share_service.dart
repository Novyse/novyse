import 'dart:io' show Directory, File;

import 'package:flutter/foundation.dart' show debugPrint, kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/message_file.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/file_download_service.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/status_message_type.dart';
import 'package:novyse/core/stores/status_store.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// Shares chat messages through the OS share sheet.
class MessageShareService {
  const MessageShareService._();

  /// Shares a single message.
  static Future<void> shareMessage(
    BuildContext context,
    WidgetRef ref,
    MessageModel message,
  ) {
    return shareMessages(context, ref, [message]);
  }

  /// Shares multiple messages: pure texts joined by blank lines + files.
  static Future<void> shareMessages(
    BuildContext context,
    WidgetRef ref,
    List<MessageModel> messages,
  ) async {
    if (messages.isEmpty) return;
    if (!context.mounted) return;
    final l10n = AppLocalizations.of(context);
    if (l10n == null) return;
    final origin = originOf(context);

    final texts = joinTexts(messages);
    final resolved = await resolveFiles(ref, messages);
    if (texts.isEmpty && resolved.files.isEmpty) {
      _fail(ref, l10n.shareFilesNotAvailable);
      return;
    }

    var filesToShare = resolved.files;
    var linuxFallback = false;
    if (currentOS == AppOS.linux && filesToShare.isNotEmpty) {
      filesToShare = [];
      linuxFallback = texts.isNotEmpty;
      if (texts.isEmpty) {
        _fail(ref, l10n.shareLinuxFilesUnsupported);
        return;
      }
    }

    try {
      final params = ShareParams(
        text: texts.isEmpty ? null : texts,
        files: filesToShare.isEmpty ? null : filesToShare,
        sharePositionOrigin: origin,
      );
      await SharePlus.instance.share(params);
      if (resolved.filesMissing) {
        _fail(ref, l10n.shareFilesNotAvailable);
      } else if (linuxFallback) {
        _warn(ref, l10n.shareLinuxFilesUnsupported);
      }
    } catch (e) {
      debugPrint('[MessageShare] share failed: $e');
      _fail(ref, l10n.shareFailed);
    } finally {
      await cleanupTemp(resolved.tempFiles);
    }
  }

  /// Visible for tests: pure-text joining logic.
  static String joinTexts(List<MessageModel> messages) {
    return messages
        .map((m) => m.content?.trim() ?? '')
        .where((t) => t.isNotEmpty)
        .join('\n\n');
  }

  /// Visible for tests: iPad/macOS popover anchor.
  static Rect? originOf(BuildContext context) {
    try {
      final box = context.findRenderObject() as RenderBox?;
      if (box != null && box.hasSize) {
        return box.localToGlobal(Offset.zero) & box.size;
      }
    } catch (_) {}
    return null;
  }

  /// Resolves attachments to shareable XFiles.
  static Future<({List<XFile> files, List<File> tempFiles, bool filesMissing})>
  resolveFiles(WidgetRef ref, List<MessageModel> messages) async {
    final files = <XFile>[];
    final tempFiles = <File>[];
    var filesMissing = false;
    for (final message in messages) {
      for (final raw in message.files) {
        final map = Map<String, dynamic>.from(raw);
        final file = MessageFile.fromMap(map);
        final out = await resolveOne(ref, file);
        if (out == null) {
          filesMissing = true;
          continue;
        }
        files.add(out.xfile);
        if (out.tempFile != null) tempFiles.add(out.tempFile!);
      }
    }
    return (files: files, tempFiles: tempFiles, filesMissing: filesMissing);
  }

  /// Resolves one attachment: direct path or download-then-copy.
  static Future<({XFile xfile, File? tempFile})?> resolveOne(
    WidgetRef ref,
    MessageFile file,
  ) async {
    final direct = file.playableUri;
    if (direct != null && !kIsWeb) {
      final cleaned = direct.replaceFirst('file://', '');
      if (cleaned.startsWith('/')) {
        try {
          final local = File(cleaned);
          if (await local.exists()) {
            return (xfile: XFile(local.path, name: file.name), tempFile: null);
          }
        } catch (_) {}
      }
    }
    try {
      final service = ref.read(fileDownloadServiceProvider);
      final uri = await service.getOrDownloadFile(
        fileUUID: file.uuid,
        ref: file.ref,
        name: file.name,
        mimeType: file.mimeType,
      );
      if (uri == null || uri.isEmpty) return null;
      return await copyUriToShareTemp(uri, file.name);
    } catch (e) {
      debugPrint('[MessageShare] resolve failed for ${file.name}: $e');
      return null;
    }
  }

  /// Copies a local uri into a temp share dir.
  static Future<({XFile xfile, File? tempFile})?> copyUriToShareTemp(
    String uri,
    String fileName,
  ) async {
    try {
      String? sourcePath;
      if (uri.startsWith('file://')) {
        sourcePath = uri.replaceFirst('file://', '');
      } else if (!kIsWeb && uri.startsWith('/')) {
        sourcePath = uri;
      } else {
        return null;
      }
      final source = File(sourcePath);
      if (!await source.exists()) return null;
      final dir = await getTemporaryDirectory();
      final shareDir = Directory(p.join(dir.path, 'novyse_share'));
      if (!await shareDir.exists()) await shareDir.create(recursive: true);
      final safeName = fileName.isEmpty
          ? 'shared_${DateTime.now().millisecondsSinceEpoch}'
          : p.basename(fileName);
      final dest = File(
        p.join(
          shareDir.path,
          '${DateTime.now().millisecondsSinceEpoch}_$safeName',
        ),
      );
      await source.copy(dest.path);
      return (xfile: XFile(dest.path, name: safeName), tempFile: dest);
    } catch (e) {
      debugPrint('[MessageShare] temp copy failed: $e');
      return null;
    }
  }

  /// Deletes temp copies.
  static Future<void> cleanupTemp(List<File> tempFiles) async {
    for (final temp in tempFiles) {
      try {
        if (await temp.exists()) await temp.delete();
      } catch (_) {}
    }
  }

  static void _fail(WidgetRef ref, String message) {
    _show(ref, StatusMessageType.danger, message);
  }

  static void _warn(WidgetRef ref, String message) {
    _show(ref, StatusMessageType.warning, message);
  }

  static void _show(WidgetRef ref, StatusMessageType type, String message) {
    try {
      ref
          .read(statusProvider.notifier)
          .showStatus(
            StatusItem(
              id: 'message_share',
              source: StatusSource.general,
              type: type,
              content: [message],
              closable: true,
              timeout: const Duration(seconds: 4),
            ),
          );
    } catch (_) {}
  }
}
