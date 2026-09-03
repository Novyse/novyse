import 'dart:io' as io;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:novyse/core/storage/file/uri_resolver.dart';
import 'package:universal_video_controls/universal_video_controls.dart';
import 'package:universal_video_controls_video_player/universal_video_controls_video_player.dart';
import 'package:video_player/video_player.dart';

/// Displays a video message with inline playback controls.
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

  VideoPlayerController? _controller;
  VideoPlayerControlsWrapper? _playerWrapper;
  bool _initialized = false;
  bool _hasError = false;

  double get _computedWidth {
    if (widget.width != null && widget.height != null && widget.height! > 0) {
      final wScale = _maxWidth / widget.width!;
      final hScale = _maxHeight / widget.height!;
      final scale = [1.0, wScale, hScale].reduce((a, b) => a < b ? a : b);
      return widget.width! * scale;
    }
    return 240;
  }

  double? get _computedAspectRatio {
    if (widget.aspectRatio != null) return widget.aspectRatio;
    if (widget.width != null && widget.height != null && widget.height! > 0) {
      return widget.width! / widget.height!;
    }
    return null;
  }

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
      return _buildError(theme);
    }

    // Use UriResolver to resolve local file refs to playable URIs or download via fileUUID
    return UriResolver(
      ref: widget.fileRef,
      fileUUID: widget.uuid,
      mimeType: 'video/mp4',
      autoDownload: true,
      placeholder: _buildThumbnail(theme),
      builder: (context, resolvedUri) {
        final displayUri = resolvedUri ?? widget.fileRef;

        if (displayUri == null || displayUri.isEmpty) {
          return _buildPlaceholder(theme);
        }

        if (!_initialized) {
          return GestureDetector(
            onTap: () => _initializePlayer(displayUri),
            child: _buildThumbnail(theme),
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
                  width: _computedWidth,
                  child: AspectRatio(
                    aspectRatio: _controller!.value.aspectRatio > 0
                        ? _controller!.value.aspectRatio
                        : (_computedAspectRatio ?? 16 / 9),
                    child: playerWidget,
                  ),
                )
              : AspectRatio(aspectRatio: 1.0, child: playerWidget),
        );
      },
    );
  }

  Widget _buildThumbnail(ThemeData theme) {
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
        aspectRatio: 1.0,
        child: Container(
          color: theme.colorScheme.surfaceContainerHighest,
          child: content,
        ),
      );
    }

    return Container(
      width: _computedWidth,
      height: 180,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: content,
    );
  }

  Widget _buildPlaceholder(ThemeData theme) {
    final indicator = Center(
      child: CircularProgressIndicator(
        strokeWidth: 2,
        color: theme.colorScheme.primary,
      ),
    );

    if (!widget.isSingle) {
      return AspectRatio(
        aspectRatio: 1.0,
        child: Container(
          color: theme.colorScheme.surfaceContainerHighest,
          child: indicator,
        ),
      );
    }

    return Container(
      width: _computedWidth,
      height: 180,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: indicator,
    );
  }

  Widget _buildError(ThemeData theme) {
    final errorIcon = Icon(
      Icons.videocam_off_rounded,
      size: 36,
      color: theme.colorScheme.onErrorContainer,
    );

    if (!widget.isSingle) {
      return AspectRatio(
        aspectRatio: 1.0,
        child: Container(
          color: theme.colorScheme.errorContainer,
          child: Center(child: errorIcon),
        ),
      );
    }

    return Container(
      width: _computedWidth,
      height: 180,
      decoration: BoxDecoration(
        color: theme.colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(child: errorIcon),
    );
  }

  String _formatDuration(int seconds) {
    final m = seconds ~/ 60;
    final s = seconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}
