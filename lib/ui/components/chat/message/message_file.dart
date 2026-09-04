import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/services/file_download_service.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/storage/file/file_utils.dart';
import 'package:novyse/core/storage/file/uri_resolver.dart';
import 'package:novyse/core/storage/file/web_blob_url_stub.dart'
    if (dart.library.html) 'package:novyse/core/storage/file/web_blob_url_web.dart'
    as web_file;
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:open_file/open_file.dart';
import 'package:url_launcher/url_launcher.dart';

/// Displays a generic file attachment (documents, archives, code, etc.)
/// with an icon, name, size info, downloading progress, and open/download action.
class MessageFileAttachment extends StatefulWidget {
  const MessageFileAttachment({
    super.key,
    required this.fileRef,
    required this.uuid,
    required this.mimeType,
    required this.name,
    this.size,
    this.isPending = false,
  });

  final String? fileRef;
  final String uuid;
  final String mimeType;
  final String name;
  final int? size;
  final bool isPending;

  @override
  State<MessageFileAttachment> createState() => _MessageFileAttachmentState();
}

class _MessageFileAttachmentState extends State<MessageFileAttachment> {
  bool _isDownloading = false;
  double _downloadProgress = 0.0;

  @override
  void initState() {
    super.initState();
    _isDownloading = FileDownloadService.instance.isDownloading(widget.uuid);
    GlobalEventEmitter.instance.on('file:download_progress', _onProgress);
    GlobalEventEmitter.instance.on('file:downloaded', _onDownloaded);
  }

  @override
  void dispose() {
    GlobalEventEmitter.instance.off('file:download_progress', _onProgress);
    GlobalEventEmitter.instance.off('file:downloaded', _onDownloaded);
    super.dispose();
  }

  void _onProgress(dynamic data) {
    if (data is Map && mounted) {
      final uuid = data['uuid'] as String?;
      if (uuid != null && uuid == widget.uuid) {
        final progress = (data['progress'] as num?)?.toDouble() ?? 0.0;
        setState(() {
          _isDownloading = true;
          _downloadProgress = progress;
        });
      }
    }
  }

  void _onDownloaded(dynamic data) {
    if (data is Map && mounted) {
      final uuid = data['fileUUID'] as String?;
      if (uuid != null && uuid == widget.uuid) {
        setState(() {
          _isDownloading = false;
          _downloadProgress = 1.0;
        });
      }
    }
  }

  Future<void> _handleTap(BuildContext context, String? resolvedUri) async {
    if (widget.isPending || _isDownloading) return;

    if (resolvedUri != null && resolvedUri.isNotEmpty) {
      // Already downloaded: open file
      await _openFile(resolvedUri);
    } else {
      // Not yet downloaded: trigger download
      setState(() {
        _isDownloading = true;
        _downloadProgress = 0.0;
      });

      final downloadedUri = await FileDownloadService.instance.downloadFile(
        fileUUID: widget.uuid,
        name: widget.name,
        mimeType: widget.mimeType,
        onProgress: (p) {
          if (mounted) setState(() => _downloadProgress = p);
        },
      );

      if (mounted) {
        setState(() => _isDownloading = false);
      }

      if (downloadedUri != null &&
          downloadedUri.isNotEmpty &&
          context.mounted) {
        await _openFile(downloadedUri);
      }
    }
  }

  Future<void> _openFile(String uri) async {
    if (uri.isEmpty) return;
    try {
      if (kIsWeb) {
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
          await launchUrl(Uri.parse(uri));
        } else {
          web_file.openOrDownloadFileWeb(uri, widget.name);
        }
      } else {
        if (uri.startsWith('http://') || uri.startsWith('https://')) {
          await launchUrl(Uri.parse(uri));
        } else {
          final cleanUri = uri.startsWith('file://')
              ? uri.replaceFirst('file://', '')
              : uri;
          await OpenFile.open(cleanUri);
        }
      }
    } catch (e) {
      debugPrint('[MessageFileAttachment] Open file error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return UriResolver(
      ref: widget.fileRef,
      fileUUID: widget.uuid,
      name: widget.name,
      mimeType: widget.mimeType,
      autoDownload: false,
      builder: (context, resolvedUri) {
        final isDownloaded = resolvedUri != null && resolvedUri.isNotEmpty;

        return InkWell(
          onTap: !widget.isPending
              ? () => _handleTap(context, resolvedUri)
              : null,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: Row(
              children: [
                // File icon / spinner
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: widget.isPending || _isDownloading
                      ? Padding(
                          padding: const EdgeInsets.all(10),
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            value: _downloadProgress > 0
                                ? _downloadProgress
                                : null,
                            color: colorScheme.primary,
                          ),
                        )
                      : HugeIcon(
                          icon: fileIconForMime(widget.mimeType),
                          color: fileIconColorForMime(
                            widget.mimeType,
                            colorScheme,
                          ),
                          size: 24,
                        ),
                ),
                const SizedBox(width: 10),
                // File info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.name,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: colorScheme.onSurface,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          if (widget.size != null && widget.size! > 0)
                            Text(
                              formatFileSize(widget.size),
                              style: TextStyle(
                                fontSize: 11,
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                          if (_isDownloading && _downloadProgress > 0)
                            Padding(
                              padding: const EdgeInsets.only(left: 6),
                              child: Text(
                                '${(_downloadProgress * 100).toInt()}%',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: colorScheme.primary,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Action icon (download or open)
                if (!widget.isPending && !_isDownloading)
                  Padding(
                    padding: const EdgeInsets.only(left: 6),
                    child: AppHugeIcon(
                      icon: isDownloaded
                          ? HugeIcons.strokeRoundedDocumentAttachment
                          : HugeIcons.strokeRoundedDownload01,
                      size: 20,
                      color: isDownloaded
                          ? colorScheme.primary
                          : colorScheme.onSurfaceVariant,
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
