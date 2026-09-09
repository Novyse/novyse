import 'dart:typed_data';

import 'package:flutter/foundation.dart' show debugPrint, kIsWeb;
import 'package:flutter/material.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/chat/message_file.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/storage/file/file_storage.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/storage/file/playable_uri.dart';
import 'package:novyse/core/storage/file/web_blob_url_stub.dart'
    if (dart.library.html) 'package:novyse/core/storage/file/web_blob_url_web.dart'
    as web_blob;
import 'package:novyse/ui/components/chat/media/chat_media_viewer.dart';
import 'package:open_file/open_file.dart';
import 'package:url_launcher/url_launcher.dart';

/// Helpers to preview draft files (unsent attachments in `FilesBar`) based on
/// their [FileTypeCategory], resolved via MIME type and file name.
///
/// Draft files are local-only maps (`{name, path, uri, bytes, size, mimeType,
/// type?, duration?, waveform?}`) without a server `uuid`/`ref`, so they need
/// dedicated URI resolution:
///
/// - native/desktop: `uri`/`path` is an absolute local path, directly playable;
/// - web: `uri` is only a name hint, the playable URL is built from `bytes`
///   as a blob URL.
///
/// Preview routing (mirrors sent-message rendering in `MessageBase`):
///
/// - audio/voice -> inline mini-player wired to [ChatAudioService];
/// - image/video -> [showChatMediaViewer] gallery built from draft files;
/// - document/code/archive/other -> system default (`OpenFile` on native,
///   browser open/download on web, like `MessageFileAttachment`).
String draftFileId(String chatUUID, int index) => 'draft:$chatUUID:$index';

String draftFileName(dynamic file) {
  if (file is Map) {
    return (file['name'] ?? file['fileName'] ?? 'File').toString();
  }
  return 'File';
}

int draftFileSize(dynamic file) {
  if (file is Map) {
    final sizeVal = file['size'] ?? file['fileSize'] ?? 0;
    return sizeVal is num ? sizeVal.toInt() : 0;
  }
  return 0;
}

/// Adapts a draft file map to [MessageFile] so category detection
/// (`isImage`, `isAudio`, `isVoice`, ...) matches sent messages exactly,
/// including `type: 'VOICE'` and `novyse_vocal_*` voice detection.
MessageFile draftMessageFile(
  dynamic file, {
  required String chatUUID,
  required int index,
}) {
  final map = file is Map
      ? Map<String, dynamic>.from(file)
      : <String, dynamic>{};
  final uuid = (map['uuid'] ?? '').toString();
  if (uuid.isEmpty) {
    map['uuid'] = draftFileId(chatUUID, index);
  }
  return MessageFile.fromMap(map);
}

Uint8List? draftFileBytes(dynamic file) {
  if (file is! Map) return null;
  final bytes = file['bytes'];
  if (bytes == null) return null;
  if (bytes is Uint8List) return bytes;
  if (bytes is List<int>) return Uint8List.fromList(bytes);
  return null;
}

String? _draftRawRef(dynamic file) {
  if (file is! Map) return null;
  for (final key in const ['uri', 'path', 'ref']) {
    final value = file[key];
    if (value is String && value.isNotEmpty) return value;
  }
  return null;
}

/// In-memory blob URL cache for web draft previews, keyed by a stable
/// `chatUUID::name::size` key (indexes shift on remove, names do not).
final Map<String, String> _draftBlobUrls = {};

String _draftBlobKey(String chatUUID, dynamic file) {
  return '$chatUUID::${draftFileName(file)}::${draftFileSize(file)}';
}

void _cacheDraftBlobUrl(String chatUUID, dynamic file, String url) {
  _draftBlobUrls[_draftBlobKey(chatUUID, file)] = url;
}

String? _cachedDraftBlobUrl(String chatUUID, dynamic file) {
  return _draftBlobUrls[_draftBlobKey(chatUUID, file)];
}

/// Revokes cached web blob URLs for a single draft file.
void revokeDraftBlobForFile(String chatUUID, dynamic file) {
  final key = _draftBlobKey(chatUUID, file);
  final url = _draftBlobUrls.remove(key);
  web_blob.revokeWebBlobUrl(url);
}

/// Revokes all cached web blob URLs of a chat draft.
void revokeDraftBlobsForChat(String chatUUID) {
  final prefix = '$chatUUID::';
  final keys = _draftBlobUrls.keys
      .where((k) => k.startsWith(prefix))
      .toList();
  for (final key in keys) {
    web_blob.revokeWebBlobUrl(_draftBlobUrls.remove(key));
  }
}

/// Resolves a draft file to a URI that players, the media viewer or the
/// system opener can consume directly.
///
/// Returns `null` when the file cannot be resolved locally (e.g. web file
/// without bytes).
Future<String?> resolveDraftFileUri(
  dynamic file, {
  required String chatUUID,
}) async {
  if (file is! Map) return null;
  final mime = getMimeType(file);
  final raw = _draftRawRef(file);

  // Already playable (http/https/blob/data URLs, native absolute paths).
  if (isPlayableMediaUri(raw)) return raw;

  if (kIsWeb) {
    final cached = _cachedDraftBlobUrl(chatUUID, file);
    if (cached != null && cached.isNotEmpty) return cached;

    Uint8List? effective = draftFileBytes(file);
    effective ??= (raw != null && raw.isNotEmpty)
        ? FileStorage.instance.getBytesSync(raw)
        : null;
    effective ??= (raw != null && raw.isNotEmpty)
        ? await FileStorage.instance.getBytes(raw)
        : null;
    if (effective == null || effective.isEmpty) return null;

    final url = web_blob.createWebBlobUrl(effective, mime);
    if (url == null || url.isEmpty) return null;
    _cacheDraftBlobUrl(chatUUID, file, url);
    return url;
  }

  // Native: fall back to storage-key resolution, else the raw ref itself.
  if (raw != null && raw.isNotEmpty) {
    try {
      final stored = await FileStorage.instance.read(raw, mime);
      if (stored != null && stored.isNotEmpty) return stored;
    } catch (e) {
      debugPrint('[DraftFilePreview] Storage read error: $e');
    }
    return raw;
  }
  return null;
}

void _showDraftSnack(BuildContext context, String message) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));
}

/// Opens a generic draft file (document, code, archive, other) with the
/// system default: browser open/download on web, `OpenFile` on native —
/// same behavior as [MessageFileAttachment] for sent files.
Future<void> openDraftFileWithSystem(
  BuildContext context, {
  required dynamic file,
  required String chatUUID,
}) async {
  final l10n = AppLocalizations.of(context);
  final name = draftFileName(file);

  String? uri;
  try {
    uri = await resolveDraftFileUri(file, chatUUID: chatUUID);
  } catch (e) {
    debugPrint('[DraftFilePreview] Resolve error: $e');
  }
  if (!context.mounted) return;
  if (uri == null || uri.isEmpty) {
    _showDraftSnack(
      context,
      l10n?.previewFileUnavailable ?? 'Unable to preview this file',
    );
    return;
  }

  try {
    final isRemote =
        uri.startsWith('http://') || uri.startsWith('https://');
    if (kIsWeb) {
      if (isRemote) {
        await launchUrl(Uri.parse(uri));
      } else {
        web_blob.openOrDownloadFileWeb(uri, name);
      }
    } else {
      if (isRemote) {
        await launchUrl(Uri.parse(uri));
      } else {
        final cleanPath = uri.startsWith('file://')
            ? uri.replaceFirst('file://', '')
            : uri;
        await OpenFile.open(cleanPath);
      }
    }
  } catch (e) {
    debugPrint('[DraftFilePreview] Open file error: $e');
    if (context.mounted) {
      _showDraftSnack(
        context,
        l10n?.previewFileUnavailable ?? 'Unable to preview this file',
      );
    }
  }
}

/// Opens every image/video of the draft in the shared chat media viewer as a
/// swipeable gallery, starting from the tapped file.
Future<void> openDraftMediaGallery(
  BuildContext context, {
  required String chatUUID,
  required List<dynamic> files,
  required int tappedIndex,
}) async {
  final l10n = AppLocalizations.of(context);

  final mediaIndexes = <int>[];
  final mediaFlags = <bool>[];
  final mediaMimes = <String>[];
  for (var i = 0; i < files.length; i++) {
    final msg = draftMessageFile(files[i], chatUUID: chatUUID, index: i);
    if (msg.isImage || msg.isVideo) {
      mediaIndexes.add(i);
      mediaFlags.add(msg.isVideo);
      mediaMimes.add(msg.mimeType);
    }
  }
  if (mediaIndexes.isEmpty) {
    _showDraftSnack(
      context,
      l10n?.previewFileUnavailable ?? 'Unable to preview this file',
    );
    return;
  }

  final items = <ChatMediaItem>[];
  for (var k = 0; k < mediaIndexes.length; k++) {
    final i = mediaIndexes[k];
    String? uri;
    try {
      uri = await resolveDraftFileUri(files[i], chatUUID: chatUUID);
    } catch (e) {
      debugPrint('[DraftFilePreview] Gallery resolve error: $e');
    }
    uri ??= _draftRawRef(files[i]);
    if (!isPlayableMediaUri(uri)) continue;
    items.add(
      ChatMediaItem(
        id: draftFileId(chatUUID, i),
        fileRef: uri,
        isVideo: mediaFlags[k],
        mimeType: mediaMimes[k],
      ),
    );
  }

  if (!context.mounted) return;
  if (items.isEmpty) {
    _showDraftSnack(
      context,
      l10n?.previewFileUnavailable ?? 'Unable to preview this file',
    );
    return;
  }

  var initialId = draftFileId(chatUUID, tappedIndex);
  if (!items.any((item) => item.id == initialId)) {
    initialId = items.first.id;
  }
  await showChatMediaViewer(
    context,
    chatUUID: chatUUID,
    items: items,
    initialFileUUID: initialId,
  );
}

/// Stops playback when it belongs to a draft file of [chatUUID],
/// e.g. before removing/clearing draft files.
Future<void> stopDraftAudioForChat(String chatUUID) async {
  final activeId = ChatAudioService.instance.activeId;
  if (activeId != null && activeId.startsWith('draft:$chatUUID:')) {
    await ChatAudioService.instance.stop();
  }
}

/// Toggles play/pause for an audio/voice draft file.
///
/// The URI is resolved lazily at tap time. Returns `true` when playback was
/// toggled, `false` when the file cannot be played locally.
/// Single-playback is enforced by [ChatAudioService] (starting a new track
/// stops any previous one, across drafts and messages).
Future<bool> toggleDraftAudioPlayback({
  required String chatUUID,
  required int index,
  required dynamic file,
  int? durationSeconds,
}) async {
  String? uri;
  try {
    uri = await resolveDraftFileUri(file, chatUUID: chatUUID);
  } catch (e) {
    debugPrint('[DraftFilePreview] Audio resolve error: $e');
  }
  if (!isPlayableMediaUri(uri)) return false;
  await ChatAudioService.instance.togglePlayPause(
    id: draftFileId(chatUUID, index),
    uri: uri!,
    initialDuration: durationSeconds != null
        ? Duration(seconds: durationSeconds)
        : null,
  );
  return true;
}
