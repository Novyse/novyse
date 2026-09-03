import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/services/file_download_service.dart';
import 'package:novyse/core/storage/file/file_storage.dart';

import 'web_blob_url_stub.dart'
    if (dart.library.html) 'web_blob_url_web.dart'
    as web_blob;

/// Resolves a local file reference (storage key, file path, URL, or fileUUID) into a
/// playable URI that media widgets (Image, VideoPlayer, AudioPlayer) can use.
///
/// If the file is not yet cached locally, it can automatically download it from
/// the remote server / S3 via [FileDownloadService].
class UriResolver extends StatefulWidget {
  const UriResolver({
    super.key,
    this.ref,
    this.fileUUID,
    this.name,
    required this.builder,
    this.placeholder,
    this.mimeType,
    this.autoDownload = true,
  });

  /// The file reference to resolve. Can be:
  /// - A storage key (e.g., `fileUUID.m4a`)
  /// - A local file path (e.g., `/path/to/file.m4a` or `file:///path/to/file.m4a`)
  /// - A network URL (e.g., `https://...`)
  /// - A blob URL (e.g., `blob:...`)
  final String? ref;

  /// Optional file UUID to download/resolve if the file is not yet stored locally.
  final String? fileUUID;

  /// Optional file name hint.
  final String? name;

  /// Builder called with the resolved URI. Receives `null` if resolution fails.
  final Widget Function(BuildContext context, String? resolvedUri) builder;

  /// Widget shown while the URI is being resolved.
  final Widget? placeholder;

  /// Optional MIME type hint (used for web blob URL creation).
  final String? mimeType;

  /// Whether to automatically download the file if missing locally.
  final bool autoDownload;

  @override
  State<UriResolver> createState() => _UriResolverState();
}

class _UriResolverState extends State<UriResolver> {
  String? _resolvedUri;
  bool _loading = true;
  String? _blobUrl;

  @override
  void initState() {
    super.initState();
    GlobalEventEmitter.instance.on('file:downloaded', _onFileDownloaded);
    _resolve();
  }

  @override
  void didUpdateWidget(UriResolver oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.ref != widget.ref || oldWidget.fileUUID != widget.fileUUID) {
      _revokeBlobUrl();
      _resolve();
    }
  }

  @override
  void dispose() {
    GlobalEventEmitter.instance.off('file:downloaded', _onFileDownloaded);
    _revokeBlobUrl();
    super.dispose();
  }

  void _onFileDownloaded(dynamic data) {
    if (data is Map && mounted) {
      final uuid = data['fileUUID'] as String?;
      final uri = data['uri'] as String?;
      if (uuid != null && uuid == widget.fileUUID && uri != null) {
        _setResolvedUri(uri);
      }
    }
  }

  void _setResolvedUri(String? uri) {
    if (!mounted) return;
    if (kIsWeb &&
        uri != null &&
        !uri.startsWith('blob:') &&
        !uri.startsWith('http://') &&
        !uri.startsWith('https://') &&
        !uri.startsWith('data:')) {
      final bytes = FileStorage.instance.getBytesSync(uri);
      if (bytes != null) {
        _setBlobFromBytes(bytes);
        return;
      }
    }
    setState(() {
      _resolvedUri = uri;
      _loading = false;
    });
  }

  void _setBlobFromBytes(Uint8List bytes) {
    _revokeBlobUrl();
    final blobUrl = web_blob.createWebBlobUrl(bytes, widget.mimeType);
    _blobUrl = blobUrl;
    if (mounted) {
      setState(() {
        _resolvedUri = blobUrl;
        _loading = false;
      });
    }
  }

  void _revokeBlobUrl() {
    if (_blobUrl != null) {
      web_blob.revokeWebBlobUrl(_blobUrl);
      _blobUrl = null;
    }
  }

  Future<void> _resolve() async {
    final ref = widget.ref;
    final fileUUID = widget.fileUUID;

    // If both ref and fileUUID are empty, nothing to resolve
    if ((ref == null || ref.isEmpty) &&
        (fileUUID == null || fileUUID.isEmpty)) {
      if (mounted) {
        setState(() {
          _resolvedUri = null;
          _loading = false;
        });
      }
      return;
    }

    // Already a playable URL
    if (ref != null &&
        (ref.startsWith('http://') ||
            ref.startsWith('https://') ||
            ref.startsWith('blob:') ||
            ref.startsWith('data:'))) {
      if (mounted) {
        setState(() {
          _resolvedUri = ref;
          _loading = false;
        });
      }
      return;
    }

    // Local file path (native only)
    if (!kIsWeb &&
        ref != null &&
        (ref.startsWith('file://') || ref.startsWith('/'))) {
      if (mounted) {
        setState(() {
          _resolvedUri = ref;
          _loading = false;
        });
      }
      return;
    }

    // Web: create blob URL from in-memory bytes
    if (kIsWeb && ref != null) {
      final bytes = FileStorage.instance.getBytesSync(ref);
      if (bytes != null) {
        _setBlobFromBytes(bytes);
        return;
      }
    }

    // Native / Storage: attempt to read local ref
    if (ref != null && ref.isNotEmpty) {
      try {
        final uri = await FileStorage.instance.read(ref, widget.mimeType);
        if (uri != null && uri.isNotEmpty) {
          if (mounted) {
            _setResolvedUri(uri);
          }
          return;
        }
      } catch (e) {
        debugPrint('[UriResolver] Error resolving ref "$ref": $e');
      }
    }

    // If local ref not found, resolve or download via FileDownloadService
    if (fileUUID != null && fileUUID.isNotEmpty) {
      try {
        final uri = await FileDownloadService.instance.getOrDownloadFile(
          fileUUID: fileUUID,
          ref: ref,
          name: widget.name,
          mimeType: widget.mimeType,
          autoDownload: widget.autoDownload,
        );

        if (mounted) {
          _setResolvedUri(uri);
        }
        return;
      } catch (e) {
        debugPrint('[UriResolver] Error resolving fileUUID "$fileUUID": $e');
      }
    }

    if (mounted) {
      setState(() {
        _resolvedUri = null;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return widget.placeholder ?? const SizedBox.shrink();
    }
    return widget.builder(context, _resolvedUri);
  }
}
