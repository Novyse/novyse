import 'dart:io' as io;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:novyse/core/storage/file/uri_resolver.dart';
import 'package:universal_video_controls/universal_video_controls.dart';
import 'package:universal_video_controls_video_player/universal_video_controls_video_player.dart';
import 'package:video_player/video_player.dart';

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
  });

  final String? fileRef;
  final String uuid;
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

  VideoPlayerController? _controller;
  VideoPlayerControlsWrapper? _playerWrapper;
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
  void dispose() {
    _playerWrapper?.dispose();
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _initializePlayer(String uri) async {
    try {
      if (!kIsWeb && (uri.startsWith('file://') || uri.startsWith('/'))) {
        final cleanPath = uri.startsWith('file://')
            ? uri.replaceFirst('file://', '')
            : uri;
        _controller = VideoPlayerController.file(io.File(cleanPath));
      } else {
        _controller = VideoPlayerController.networkUrl(Uri.parse(uri));
      }
      await _controller!.initialize();

      if (!mounted) return;

      _playerWrapper = VideoPlayerControlsWrapper(_controller!);

      setState(() => _initialized = true);
    } catch (e) {
      if (mounted) {
        setState(() => _hasError = true);
      }
    }
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

        if (!_initialized) {
          return GestureDetector(
            onTap: () => _initializePlayer(displayUri),
            child: _buildThumbnail(theme, context),
          );
        }

        final playerWidget = VideoControls(
          player: _playerWrapper!,
          controls: AdaptiveVideoControls,
        );

        return ClipRRect(
          borderRadius: BorderRadius.circular(widget.isSingle ? 12 : 4),
          child: widget.isSingle
              ? SizedBox(
                  width: _boxWidth(context),
                  child: AspectRatio(
                    aspectRatio: _controller!.value.aspectRatio > 0
                        ? _controller!.value.aspectRatio
                        : _effectiveAspect,
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
          child: const Icon(
            Icons.play_arrow_rounded,
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
    final errorIcon = Icon(
      Icons.videocam_off_rounded,
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
