import 'dart:async' show unawaited;
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/comms_share_config.dart';
import 'package:novyse/core/l10n/l10n.dart';

/// Desktop source type for screen share.
enum ScreenShareType { screen, window }

/// Lightweight capture config used only for the preview (not the real share).
const _previewConfig = ScreenShareConfig(
  mode: 'smooth',
  customQuality: '720p',
  customFps: '30',
);

/// Live video preview of a single desktop source (screen or window).
///
/// Captures and releases its own preview tracks using a fixed lightweight
/// config. When [source] or [type] changes, previous tracks are stopped and new
/// ones are captured for the requested source.
///
/// Set [releaseOnDispose] to false when the caller takes ownership of the
/// tracks via [handoff], e.g. when starting a share from the setup menu so the
/// preview tracks are reused instead of recaptured.
class ScreenShareSourcePreview extends StatefulWidget {
  /// Desktop source to preview. When null, no track is captured and an empty
  /// placeholder is shown.
  final DesktopCapturerSource? source;

  /// Source type (entire screen or single window).
  final ScreenShareType type;

  /// Height of the preview container.
  final double height;

  /// Whether to release (stop) tracks when the widget is disposed.
  /// Set to false when the caller takes ownership of the tracks (handoff).
  final bool releaseOnDispose;

  /// Notified whenever the capture state changes.
  final void Function({
    required LocalVideoTrack? video,
    required List<LocalAudioTrack> audios,
    required bool loading,
    required bool failed,
  })?
  onCaptureChanged;

  const ScreenShareSourcePreview({
    super.key,
    this.source,
    required this.type,
    this.height = 260,
    this.releaseOnDispose = true,
    this.onCaptureChanged,
  });

  @override
  State<ScreenShareSourcePreview> createState() =>
      _ScreenShareSourcePreviewState();
}

class _ScreenShareSourcePreviewState extends State<ScreenShareSourcePreview> {
  LocalVideoTrack? _video;
  List<LocalAudioTrack> _audios = [];
  bool _loading = false;
  bool _failed = false;
  String? _capturedSourceId;
  bool _disposed = false;
  bool _handedOff = false;
  int _captureSeq = 0;

  @override
  void initState() {
    super.initState();
    unawaited(_capture());
  }

  @override
  void didUpdateWidget(ScreenShareSourcePreview oldWidget) {
    super.didUpdateWidget(oldWidget);
    final id = widget.source?.id;
    if (_capturedSourceId != id || oldWidget.type != widget.type) {
      unawaited(_capture());
    } else if (id == null && _video != null) {
      unawaited(_stop());
    }
  }

  @override
  void dispose() {
    _disposed = true;
    if (widget.releaseOnDispose && !_handedOff) {
      unawaited(_stop());
    }
    super.dispose();
  }

  /// Stops all preview tracks held by this widget.
  Future<void> _stop() async {
    if (_handedOff) return;
    final video = _video;
    final audios = List<LocalAudioTrack>.from(_audios);
    _video = null;
    _audios = [];
    _loading = false;
    if (video != null) {
      try {
        await video.stop();
      } catch (_) {}
    }
    for (final audio in audios) {
      try {
        await audio.stop();
      } catch (_) {}
    }
    if (mounted && !_disposed) {
      widget.onCaptureChanged?.call(
        video: null,
        audios: const [],
        loading: false,
        failed: false,
      );
    }
  }

  /// Marks the preview as handed off: tracks will not be stopped on dispose.
  /// Returns the captured tracks so the caller can take ownership.
  ({LocalVideoTrack? video, List<LocalAudioTrack> audios}) handoff() {
    _handedOff = true;
    return (video: _video, audios: List<LocalAudioTrack>.from(_audios));
  }

  /// Captures preview tracks for the currently selected source.
  Future<void> _capture() async {
    final seq = ++_captureSeq;
    await _stop();
    final src = widget.source;
    if (src == null) {
      if (seq != _captureSeq) return;
      if (mounted && !_disposed) {
        setState(() {
          _loading = false;
          _failed = false;
        });
        widget.onCaptureChanged?.call(
          video: null,
          audios: const [],
          loading: false,
          failed: false,
        );
      }
      return;
    }

    if (!mounted) return;
    if (seq != _captureSeq) return;
    setState(() {
      _loading = true;
      _failed = false;
    });
    widget.onCaptureChanged?.call(
      video: null,
      audios: const [],
      loading: true,
      failed: false,
    );

    try {
      final tracks = await LocalVideoTrack.createScreenShareTracksWithAudio(
        _previewConfig.captureOptions(
          sourceId: src.id,
          captureScreenAudio: false,
        ),
      );
      if (_disposed || !mounted || seq != _captureSeq) {
        for (final t in tracks) {
          try {
            await t.stop();
          } catch (_) {}
        }
        return;
      }
      final videos = tracks.whereType<LocalVideoTrack>().toList();
      final audios = tracks.whereType<LocalAudioTrack>().toList();
      final failed = videos.isEmpty;
      _capturedSourceId = src.id;
      _video = videos.isNotEmpty ? videos.first : null;
      _audios = audios;
      if (mounted && !_disposed && seq == _captureSeq) {
        setState(() {
          _loading = false;
          _failed = failed;
        });
        widget.onCaptureChanged?.call(
          video: _video,
          audios: _audios,
          loading: false,
          failed: failed,
        );
      }
      for (final extra in videos.skip(1)) {
        try {
          await extra.stop();
        } catch (_) {}
      }
    } catch (e) {
      debugPrint('[ScreenShareSourcePreview] Capture failed: $e');
      if (_disposed || !mounted || seq != _captureSeq) return;
      setState(() {
        _loading = false;
        _failed = true;
      });
      widget.onCaptureChanged?.call(
        video: null,
        audios: const [],
        loading: false,
        failed: true,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final noSourceLabel = widget.type == ScreenShareType.window
        ? l10n.screenShareNoWindowsDetected
        : l10n.screenShareNoScreensDetected;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.12),
            ),
            color: Colors.black,
          ),
          clipBehavior: Clip.antiAlias,
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _failed || _video == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.monitor_rounded,
                          size: 36,
                          color: Colors.white24,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          widget.source == null
                              ? noSourceLabel
                              : l10n.screenShareCaptureFailed,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.white70,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : VideoTrackRenderer(_video!, fit: VideoViewFit.cover),
        ),
      ],
    );
  }
}
