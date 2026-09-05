import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:novyse/core/storage/file/uri_resolver.dart';
import 'package:novyse/ui/components/chat/media/chat_media_viewer.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class MessageVideo extends StatefulWidget {
  const MessageVideo({
    super.key,
    required this.fileRef,
    required this.uuid,
    this.size,
    this.width,
    this.height,
    this.duration,
    this.isSingle = true,
    this.isPending = false,
    this.aspectRatio,
    this.chatUUID,
  });

  final String? fileRef;
  final String uuid;
  final String? chatUUID;
  final int? size;
  final int? width;
  final int? height;
  final int? duration;
  final bool isSingle;
  final bool isPending;
  final double? aspectRatio;

  @override
  State<MessageVideo> createState() => _MessageVideoState();
}

class _MessageVideoState extends State<MessageVideo> {
  static const double _maxWidth = 260.0;
  static const double _maxHeight = 320.0;
  static const double _fallbackAspect = 16 / 9;

  Player? _player;
  VideoController? _controller;
  String? _openedUri;
  bool _initialized = false;
  bool _hasError = false;

  double _capWidth(BuildContext context) {
    return (MediaQuery.sizeOf(context).width * 0.6 - 32).clamp(120.0, _maxWidth);
  }

  double _boxWidth(BuildContext context) {
    if (widget.width != null && widget.height != null && widget.height! > 0) {
      final cap = _capWidth(context);
      final wScale = cap / widget.width!;
      final hScale = _maxHeight / widget.height!;
      final scale = [1.0, wScale, hScale].reduce((a, b) => a < b ? a : b);
      return widget.width! * scale;
    }
    return _capWidth(context);
  }

  double? get _metadataAspect {
    if (widget.aspectRatio != null) return widget.aspectRatio;
    if (widget.width != null && widget.height != null && widget.height! > 0) {
      return widget.width! / widget.height!;
    }
    return null;
  }

  double get _effectiveAspect => _metadataAspect ?? _fallbackAspect;

  double _gridAspect() => _effectiveAspect.clamp(0.5, 2.0);

  @override
  void didUpdateWidget(MessageVideo oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.fileRef != widget.fileRef || oldWidget.uuid != widget.uuid) {
      _player?.dispose();
      _player = null;
      _controller = null;
      _openedUri = null;
      _initialized = false;
      _hasError = false;
    }
  }

  @override
  void dispose() {
    _player?.dispose();
    super.dispose();
  }

  String _toMediaUri(String uri) {
    if (kIsWeb) return uri;
    if (uri.startsWith('http://') ||
        uri.startsWith('https://') ||
        uri.startsWith('blob:') ||
        uri.startsWith('data:')) {
      return uri;
    }
    if (uri.startsWith('file://')) return uri;
    return 'file://$uri';
  }

  Future<void> _initializePlayer(String uri) async {
    if (_initialized && _openedUri == uri) return;
    try {
      await _player?.dispose();
      final player = Player();
      final controller = VideoController(player);
      if (mounted) {
        setState(() {
          _player = player;
          _controller = controller;
        });
      } else {
        await player.dispose();
        return;
      }
      await player.open(Media(_toMediaUri(uri)));
      if (!mounted) return;
      setState(() {
        _initialized = true;
        _openedUri = uri;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _hasError = true);
      }
    }
  }

  void _openFullscreen(BuildContext context) {
    final chatUUID = widget.chatUUID;
    if (chatUUID == null) return;
    _player?.pause();
    showChatMediaViewer(
      context,
      chatUUID: chatUUID,
      initialFileUUID: widget.uuid,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_hasError) {
      return _buildError(theme, context);
    }

    return UriResolver(
      ref: widget.fileRef,
      fileUUID: widget.uuid,
      mimeType: 'video/mp4',
      autoDownload: true,
      placeholder: _buildThumbnail(theme, context),
      builder: (context, resolvedUri) {
        final displayUri = resolvedUri ?? widget.fileRef;

        if (displayUri == null || displayUri.isEmpty) {
          return _buildPlaceholder(theme, context);
        }

        if (!_initialized || _controller == null) {
          return GestureDetector(
            onTap: () => _initializePlayer(displayUri),
            child: _buildThumbnail(theme, context),
          );
        }

        if (_openedUri != null && _openedUri != displayUri) {
          _player?.open(Media(_toMediaUri(displayUri)));
          _openedUri = displayUri;
        }

        final playerWidget = Stack(
          children: [
            Video(controller: _controller!, controls: AdaptiveVideoControls),
            Positioned(
              top: 4,
              right: 4,
              child: Material(
                color: Colors.black45,
                shape: const CircleBorder(),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: () => _openFullscreen(context),
                  child: const Padding(
                    padding: EdgeInsets.all(6),
                    child: Icon(
                      Icons.fullscreen,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ),
            ),
          ],
        );

        return ClipRRect(
          borderRadius: BorderRadius.circular(widget.isSingle ? 12 : 4),
          child: widget.isSingle
              ? SizedBox(
                  width: _boxWidth(context),
                  child: AspectRatio(
                    aspectRatio: _effectiveAspect,
                    child: playerWidget,
                  ),
                )
              : AspectRatio(aspectRatio: _gridAspect(), child: playerWidget),
        );
      },
    );
  }

  Widget _buildThumbnail(ThemeData theme, BuildContext context) {
    final content = Stack(
      alignment: Alignment.center,
      children: [
        if (widget.duration != null)
          Positioned(
            bottom: 8,
            right: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                _formatDuration(widget.duration!),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        Container(
          width: 48,
          height: 48,
          decoration: const BoxDecoration(
            color: Colors.black54,
            shape: BoxShape.circle,
          ),
          child: const AppHugeIcon(
            icon: HugeIcons.strokeRoundedPlay,
            color: Colors.white,
            size: 32,
          ),
        ),
        if (widget.isPending)
          Container(
            color: Colors.black26,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: theme.colorScheme.primary,
            ),
          ),
      ],
    );

    if (!widget.isSingle) {
      return AspectRatio(
        aspectRatio: _gridAspect(),
        child: Container(
          color: theme.colorScheme.surfaceContainerHighest,
          child: content,
        ),
      );
    }

    return Container(
      width: _boxWidth(context),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: AspectRatio(aspectRatio: _effectiveAspect, child: content),
    );
  }

  Widget _buildPlaceholder(ThemeData theme, BuildContext context) {
    final indicator = Center(
      child: CircularProgressIndicator(
        strokeWidth: 2,
        color: theme.colorScheme.primary,
      ),
    );

    if (!widget.isSingle) {
      return AspectRatio(
        aspectRatio: _gridAspect(),
        child: Container(
          color: theme.colorScheme.surfaceContainerHighest,
          child: indicator,
        ),
      );
    }

    return Container(
      width: _boxWidth(context),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: AspectRatio(aspectRatio: _effectiveAspect, child: indicator),
    );
  }

  Widget _buildError(ThemeData theme, BuildContext context) {
    final errorIcon = AppHugeIcon(
      icon: HugeIcons.strokeRoundedVideoOff,
      size: 36,
      color: theme.colorScheme.onErrorContainer,
    );

    if (!widget.isSingle) {
      return AspectRatio(
        aspectRatio: _gridAspect(),
        child: Container(
          color: theme.colorScheme.errorContainer,
          child: Center(child: errorIcon),
        ),
      );
    }

    return Container(
      width: _boxWidth(context),
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: AspectRatio(aspectRatio: _effectiveAspect, child: Center(child: errorIcon)),
    );
  }

  String _formatDuration(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}
