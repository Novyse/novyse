import 'dart:async';
import 'dart:io' as io;
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:super_clipboard/super_clipboard.dart';
import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/storage/file/file_validators.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/bottom_bar/actions/files_bar.dart';

class ChatPasteHelper {
  /// Extracts file or image information from a single [DataReader] item
  /// (used for both super_clipboard and super_drag_and_drop).
  static Future<Map<String, dynamic>?> extractMediaFromDataReader(
    DataReader item,
  ) async {
    // 1. Local filesystem path (Desktop & Mobile)
    if (item.canProvide(Formats.fileUri)) {
      final completer = Completer<Uri?>();
      item.getValue<Uri>(
        Formats.fileUri,
        (uri) => completer.complete(uri),
        onError: (_) => completer.complete(null),
      );
      final uri = await completer.future;
      if (uri != null) {
        String path;
        try {
          path = uri.toFilePath();
        } catch (_) {
          path = uri.path;
        }
        int size = 0;
        if (!kIsWeb) {
          try {
            final f = io.File(path);
            if (await f.exists()) size = await f.length();
          } catch (_) {}
        }
        final name = path.split(RegExp(r'[\\/]')).last;
        return {
          'name': name,
          'path': path,
          'uri': path,
          'size': size,
          'mimeType': getMimeTypeByName(name),
        };
      }
    }

    // 2. If it's plain text without an explicit file name, ignore it
    final isText =
        item.canProvide(Formats.plainText) || item.canProvide(Formats.htmlText);

    // 3. Stream/bytes for in-memory files (Web, Screenshots, VirtualFiles, Images)
    final fileCompleter = Completer<Map<String, dynamic>?>();
    final progress = item.getFile(null, (file) async {
      try {
        final suggestedName = await item.getSuggestedName();
        final fileName = file.fileName ?? suggestedName;

        // Plain text clipboard data has no file name; do not treat it as a file
        if (isText && fileName == null) {
          if (!fileCompleter.isCompleted) fileCompleter.complete(null);
          return;
        }

        final bytes = await file.readAll();
        final name = file.fileName ??
            await item.getSuggestedName() ??
            'file_${DateTime.now().millisecondsSinceEpoch}';
        final mimeType = getMimeTypeByName(name);
        final isImage = mimeType.startsWith('image/');
        fileCompleter.complete({
          'name': name,
          'bytes': bytes,
          'size': bytes.length,
          'mimeType': mimeType,
          'type': isImage ? 'IMAGE' : 'FILE',
          'uri': name,
          'path': null,
        });
      } catch (e) {
        debugPrint('[ChatPasteHelper] Error reading file: $e');
        if (!fileCompleter.isCompleted) fileCompleter.complete(null);
      }
    }, onError: (_) {
      if (!fileCompleter.isCompleted) fileCompleter.complete(null);
    });

    if (progress != null) {
      return await fileCompleter.future;
    }

    return null;
  }

  /// Extracts files and images from a [ClipboardReader].
  static Future<List<Map<String, dynamic>>> extractMediaFromReader(
    ClipboardReader reader,
  ) async {
    final results = <Map<String, dynamic>>[];
    for (final item in reader.items) {
      final media = await extractMediaFromDataReader(item);
      if (media != null) {
        results.add(media);
      }
    }
    return results;
  }

  /// Extracts plain text from a [ClipboardReader].
  /// Returns the first plain text content found, or null if no text is present.
  static Future<String?> extractTextFromReader(ClipboardReader reader) async {
    for (final item in reader.items) {
      if (item.canProvide(Formats.plainText)) {
        final completer = Completer<String?>();
        item.getValue<String>(
          Formats.plainText,
          (text) => completer.complete(text),
          onError: (_) => completer.complete(null),
        );
        final text = await completer.future;
        if (text != null && text.isNotEmpty) {
          return text;
        }
      }
    }
    return null;
  }

  /// Pastes images or files from the clipboard into the draft.
  static Future<bool> pasteFromClipboard(dynamic ref, String chatUUID) async {
    try {
      final clipboard = SystemClipboard.instance;
      if (clipboard == null) return false;

      final reader = await clipboard.read();
      final media = await extractMediaFromReader(reader);
      if (media.isNotEmpty) {
        appendFiles(ref, chatUUID, media);
        return true;
      }
    } catch (e) {
      debugPrint('[ChatPasteHelper] pasteFromClipboard error: $e');
    }

    return false;
  }

  /// Attempts to parse [text] as one or more local file paths or `file://` URIs.
  /// If all lines are valid existing files on the local filesystem (non-web),
  /// attaches them to the draft and returns `true`.
  static Future<bool> tryAttachFromPathOrUri(
    dynamic ref,
    String chatUUID,
    String text,
  ) async {
    if (kIsWeb || text.trim().isEmpty) return false;

    final lines = text
        .split(RegExp(r'[\r\n]+'))
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .toList();
    if (lines.isEmpty) return false;

    final validFiles = <Map<String, dynamic>>[];

    for (final line in lines) {
      String cleanPath = line;
      // Strip wrapping quotes if present
      if ((cleanPath.startsWith('"') && cleanPath.endsWith('"')) ||
          (cleanPath.startsWith("'") && cleanPath.endsWith("'"))) {
        cleanPath = cleanPath.substring(1, cleanPath.length - 1).trim();
      }

      if (cleanPath.startsWith('file://')) {
        try {
          cleanPath = Uri.parse(cleanPath).toFilePath();
        } catch (_) {
          cleanPath = cleanPath.replaceFirst('file://', '');
        }
      }

      try {
        final f = io.File(cleanPath);
        if (await f.exists()) {
          // Verify it's a file, not a directory
          final stat = await f.stat();
          if (stat.type == io.FileSystemEntityType.file) {
            final size = stat.size;
            final name = cleanPath.split(RegExp(r'[\\/]')).last;
            validFiles.add({
              'name': name,
              'path': cleanPath,
              'uri': cleanPath,
              'size': size,
              'mimeType': getMimeTypeByName(name),
            });
          }
        }
      } catch (_) {}
    }

    if (validFiles.isNotEmpty && validFiles.length == lines.length) {
      appendFiles(ref, chatUUID, validFiles);
      return true;
    }

    return false;
  }

  /// Adds files dropped via Drag & Drop (desktop_drop).
  static Future<void> addDroppedFiles(
    dynamic ref,
    String chatUUID,
    List<dynamic> rawFiles,
  ) async {
    if (rawFiles.isEmpty) return;

    final newFiles = <Map<String, dynamic>>[];
    for (final file in rawFiles) {
      try {
        String name = 'file';
        try {
          name = (file.name ?? 'file').toString();
        } catch (_) {}

        int size = 0;
        try {
          size = await file.length();
        } catch (_) {}

        String? path;
        try {
          path = file.path as String?;
        } catch (_) {}

        if (!kIsWeb && path != null && size == 0) {
          try {
            final f = io.File(path);
            if (await f.exists()) size = await f.length();
          } catch (_) {}
        }

        Uint8List? bytes;
        if (kIsWeb || size == 0) {
          try {
            bytes = await file.readAsBytes();
            size = bytes?.length ?? size;
          } catch (_) {}
        }

        newFiles.add({
          'name': name,
          'path': path,
          'uri': path ?? name,
          'size': size,
          'bytes': bytes,
          'mimeType': getMimeTypeByName(name),
        });
      } catch (_) {}
    }

    if (newFiles.isNotEmpty) {
      appendFiles(ref, chatUUID, newFiles);
    }
  }

  /// Handles rich content inserted via keyboard (e.g. Gboard GIF/stickers)
  /// and sends it directly into the chat (matching GIF / sticker format and naming).
  static Future<void> handleKeyboardInserted(
    dynamic ref,
    String chatUUID,
    dynamic data, {
    int subID = 0,
  }) async {
    try {
      final bytes = data.data as Uint8List?;
      final mimeType =
          ((data.mimeType as String?) ?? 'image/png').toLowerCase();
      final uri = data.uri as String?;

      final isGif =
          mimeType.contains('gif') ||
          (uri != null && uri.toLowerCase().endsWith('.gif'));
      final ext = isGif ? 'gif' : (mimeType.split('/').last.split('+').first);
      final prefix = isGif ? 'gif' : 'sticker';
      final fileName = '${prefix}_${DateTime.now().millisecondsSinceEpoch}.$ext';
      final fileType = isGif ? 'GIF' : 'STICKER';
      final resolvedMime = isGif ? 'image/gif' : mimeType;

      Map<String, dynamic>? filePayload;

      if (bytes != null && bytes.isNotEmpty) {
        filePayload = {
          'name': fileName,
          'path': uri,
          'uri': uri ?? fileName,
          'bytes': bytes,
          'size': bytes.length,
          'mimeType': resolvedMime,
          'type': fileType,
        };
      } else if (uri != null && uri.isNotEmpty) {
        filePayload = {
          'name': fileName,
          'path': uri,
          'uri': uri,
          'size': 1,
          'mimeType': resolvedMime,
          'type': fileType,
        };
      }

      if (filePayload == null) return;

      // Send directly via queue
      final localUserUUID = _readLocalUserUUID(ref);
      final tempId = DateTime.now().millisecondsSinceEpoch;
      final now = DateTime.now().toUtc().toIso8601String();
      final queueManager = _readQueueManager(ref);

      await queueManager.addOutgoingMessageJob(
        id: tempId.toString(),
        chatUUID: chatUUID,
        subID: subID,
        message: {
          'id': tempId,
          'chatUUID': chatUUID,
          'subID': subID,
          'senderUUID': localUserUUID,
          'userUUID': localUserUUID,
          'content': '',
          'type': 'message',
          'createdAt': now,
          'status': 'PENDING_SEND',
          'files': [filePayload],
        },
        files: [filePayload],
      );
    } catch (_) {}
  }

  static String _readLocalUserUUID(dynamic ref) {
    if (ref is WidgetRef) return ref.read(userStoreProvider).localUserUUID;
    if (ref is Ref) return ref.read(userStoreProvider).localUserUUID;
    if (ref is ProviderContainer) {
      return ref.read(userStoreProvider).localUserUUID;
    }
    return (ref as dynamic).read(userStoreProvider).localUserUUID as String;
  }

  static QueueManager _readQueueManager(dynamic ref) {
    if (ref is WidgetRef) return ref.read(queueManagerProvider);
    if (ref is Ref) return ref.read(queueManagerProvider);
    if (ref is ProviderContainer) return ref.read(queueManagerProvider);
    return (ref as dynamic).read(queueManagerProvider) as QueueManager;
  }

  /// Appends files to the draft and updates validation.
  static void appendFiles(
    dynamic ref,
    String chatUUID,
    List<Map<String, dynamic>> addedFiles,
  ) {
    ChatDraftNotifier draftNotifier;
    List<dynamic> currentFiles;

    if (ref is WidgetRef) {
      draftNotifier = ref.read(chatDraftProvider(chatUUID).notifier);
      currentFiles =
          List<dynamic>.from(ref.read(chatDraftProvider(chatUUID)).files);
    } else if (ref is Ref) {
      draftNotifier = ref.read(chatDraftProvider(chatUUID).notifier);
      currentFiles =
          List<dynamic>.from(ref.read(chatDraftProvider(chatUUID)).files);
    } else if (ref is ProviderContainer) {
      draftNotifier = ref.read(chatDraftProvider(chatUUID).notifier);
      currentFiles =
          List<dynamic>.from(ref.read(chatDraftProvider(chatUUID)).files);
    } else {
      draftNotifier =
          (ref as dynamic).read(chatDraftProvider(chatUUID).notifier)
              as ChatDraftNotifier;
      currentFiles = List<dynamic>.from(
        (ref as dynamic).read(chatDraftProvider(chatUUID)).files as Iterable,
      );
    }

    final updatedFiles = [...currentFiles, ...addedFiles];
    draftNotifier.setFiles(updatedFiles);

    final validation = validateFiles(
      updatedFiles,
      maxFiles: FilesBar.maxFiles,
      maxSingleSize: FilesBar.maxSingleSize,
      maxTotalSize: FilesBar.maxTotalSize,
    );

    draftNotifier.setInvalidFiles(
      validation.invalidFilesData.map((d) => d.toMap()).toList(),
    );
  }
}
