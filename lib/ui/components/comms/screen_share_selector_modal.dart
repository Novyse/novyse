import 'dart:io' as io;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/comms_share_config.dart';
import 'package:novyse/core/comms/devices/comms_bitrate_options.dart';
import 'package:novyse/core/comms/devices/comms_media_constraints.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/comms/screen_share_quality_fields.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/switch/segmented_switch.dart';

enum ScreenShareType { screen, window }

/// Result of the mandatory screen-share setup menu.
class ScreenShareSetupResult {
  /// Chosen source (custom-picker flow only, null on native-picker flow).
  final DesktopCapturerSource? source;
  final ScreenShareType type;
  final bool includeAudio;
  final ScreenShareConfig config;

  /// Tracks captured in-menu for preview (native-picker flow only).
  /// Ownership passes to the caller: publish them, or stop them on cancel.
  final LocalVideoTrack? previewVideoTrack;
  final List<LocalAudioTrack> previewAudioTracks;

  const ScreenShareSetupResult({
    this.source,
    required this.type,
    required this.includeAudio,
    required this.config,
    this.previewVideoTrack,
    this.previewAudioTracks = const [],
  });
}

/// Mandatory setup menu shown before every screen share, on all platforms.
///
/// - Desktop with enumerator (X11 Linux, macOS, Windows): custom section
///   listing every screen/window, then per-share video settings (prefilled
///   from the settings defaults) and the audio toggle.
/// - Native-picker platforms (Wayland Linux, web, mobile): the OS picker is
///   requested automatically on open, then a preview of the chosen source is
///   shown with the same video settings + audio toggle below.
///
/// Nothing here writes to settings: the choices become the per-share
/// [ScreenShareConfig] used for that share only.
class ScreenShareSelectorModal extends StatefulWidget {
  final ScreenShareConfig initial;

  /// Whether the user has Premium; lifts the free-tier bitrate cap.
  final bool isPremium;

  const ScreenShareSelectorModal({
    super.key,
    required this.initial,
    this.isPremium = false,
  });

  static bool get hasNativePicker {
    if (kIsWeb) return false;
    if (io.Platform.isLinux) {
      final waylandDisplay = io.Platform.environment['WAYLAND_DISPLAY'];
      final sessionType = io.Platform.environment['XDG_SESSION_TYPE'];
      return (waylandDisplay != null && waylandDisplay.isNotEmpty) ||
          sessionType?.toLowerCase() == 'wayland';
    }
    return false;
  }

  static bool get useCustomPicker {
    if (kIsWeb) return false;
    if (hasNativePicker) return false;
    return io.Platform.isLinux || io.Platform.isMacOS || io.Platform.isWindows;
  }

  static Future<ScreenShareSetupResult?> show(
    BuildContext context, {
    required ScreenShareConfig initial,
    bool isPremium = false,
  }) {
    return ResponsiveOverlay.show<ScreenShareSetupResult>(
      context: context,
      // Picker with thumbnails needs more room than the default 480px.
      mode: ResponsiveOverlayMode.modal,
      maxWidth: 620,
      maxHeightFactor: 0.9,
      child: ScreenShareSelectorModal(initial: initial, isPremium: isPremium),
    );
  }

  @override
  State<ScreenShareSelectorModal> createState() =>
      _ScreenShareSelectorModalState();
}

class _ScreenShareSelectorModalState extends State<ScreenShareSelectorModal> {
  // Per-share config draft (prefilled from settings defaults).
  late String _mode = widget.initial.mode;
  late String _quality = widget.initial.customQuality;
  late String _fps = widget.initial.customFps;
  late int _bitrateKbps = ScreenShareQualityFields.bitrateOrDefault(
    widget.initial.maxBitrateKbps,
    quality: widget.initial.customQuality,
    fps: widget.initial.customFps,
  );
  late bool _userCustomizedBitrate = widget.initial.maxBitrateKbps != null;

  // Custom-picker flow.
  ScreenShareType _selectedType = ScreenShareType.screen;
  List<DesktopCapturerSource> _sources = [];
  DesktopCapturerSource? _selectedSource;
  bool _includeAudio = false;
  bool _loading = true;

  // Native-picker flow (preview captured in-menu).
  LocalVideoTrack? _previewVideo;
  List<LocalAudioTrack> _previewAudio = [];
  bool _captureLoading = false;
  bool _captureFailed = false;
  bool _handedOff = false;

  bool get _custom => ScreenShareSelectorModal.useCustomPicker;
  bool get _isCustomMode =>
      CommsMediaConstraints.resolveShareMode(_mode) ==
      CommsMediaConstraints.shareCustom;

  @override
  void initState() {
    super.initState();
    if (_custom) {
      _loadSources();
    } else {
      _requestCapture();
    }
  }

  @override
  void dispose() {
    if (!_handedOff) _stopPreviewTracks();
    super.dispose();
  }

  ScreenShareConfig get _draft => ScreenShareConfig(
    mode: _mode,
    customQuality: _quality,
    customFps: _fps,
    maxBitrateKbps: _isCustomMode ? _bitrateKbps : null,
  );

  /// Validation result for the current bitrate, checked before starting.
  CommsBitrateError get _bitrateError {
    if (!_isCustomMode) return CommsBitrateError.none;
    return CommsBitrateOptions.validate(
      kbps: _bitrateKbps,
      fps: _draft.resolveMaxFrameRate().round(),
      quality: _draft.resolveEffectiveQuality(),
      isPremium: widget.isPremium,
    );
  }

  void _updateBitrateForSelection({bool forceDefault = false}) {
    if (forceDefault) {
      _userCustomizedBitrate = false;
    }
    _bitrateKbps = ScreenShareQualityFields.bitrateOrDefault(
      _userCustomizedBitrate ? _bitrateKbps : null,
      quality: _quality,
      fps: _fps,
    );
  }

  void _syncPreviewOptions() {
    final video = _previewVideo;
    if (video != null) {
      final opts = _draft.captureOptions(captureScreenAudio: true);
      video.currentOptions = opts;
      try {
        video.mediaStreamTrack.applyConstraints({
          'width': opts.params.dimensions.width,
          'height': opts.params.dimensions.height,
          'frameRate': opts.maxFrameRate,
        });
      } catch (_) {}
    }
  }

  Future<void> _stopPreviewTracks() async {
    final video = _previewVideo;
    final audios = List<LocalAudioTrack>.from(_previewAudio);
    _previewVideo = null;
    _previewAudio = [];
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
  }

  /// Runs the OS picker and keeps the captured tracks for preview/publish.
  Future<void> _requestCapture() async {
    await _stopPreviewTracks();
    if (!mounted) return;
    setState(() {
      _captureLoading = true;
      _captureFailed = false;
    });
    try {
      final tracks = await LocalVideoTrack.createScreenShareTracksWithAudio(
        _draft.captureOptions(captureScreenAudio: true),
      );
      if (!mounted) {
        for (final t in tracks) {
          try {
            await t.stop();
          } catch (_) {}
        }
        return;
      }
      final videos = tracks.whereType<LocalVideoTrack>().toList();
      final audios = tracks.whereType<LocalAudioTrack>().toList();
      setState(() {
        _previewVideo = videos.isNotEmpty ? videos.first : null;
        _previewAudio = audios;
        _captureLoading = false;
        _captureFailed = videos.isEmpty;
      });
      for (final extra in videos.skip(1)) {
        try {
          await extra.stop();
        } catch (_) {}
      }
    } catch (e) {
      debugPrint('[ScreenShareSetup] OS capture failed or cancelled: $e');
      if (mounted) {
        setState(() {
          _captureLoading = false;
          _captureFailed = true;
        });
      }
    }
  }

  Future<void> _loadSources() async {
    setState(() {
      _loading = true;
      _selectedSource = null;
    });

    try {
      final type = _selectedType == ScreenShareType.screen
          ? SourceType.Screen
          : SourceType.Window;

      final sources = await desktopCapturer.getSources(types: [type]);
      if (mounted) {
        setState(() {
          _sources = sources;
          _selectedSource = sources.isNotEmpty ? sources.first : null;
          _loading = false;
        });
      }
    } catch (e) {
      debugPrint('[ScreenShareSelector] Error loading desktop sources: $e');
      if (mounted) {
        setState(() {
          _sources = [];
          _loading = false;
        });
      }
    }
  }

  void _onTypeChanged(ScreenShareType type) {
    if (_selectedType == type) return;
    setState(() {
      _selectedType = type;
      if (type == ScreenShareType.window) {
        _includeAudio = false;
      }
    });
    _loadSources();
  }

  void _popResult(ScreenShareSetupResult result) {
    _handedOff = true;
    Navigator.of(context, rootNavigator: true).pop(result);
  }

  void _cancel() {
    Navigator.of(context, rootNavigator: true).pop();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    // Content only: Dialog chrome, padding and min/max sizing are provided
    // by OverlayDialog via ResponsiveOverlay.show().
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              l10n.screenShareSetupTitle,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close_rounded),
              onPressed: _cancel,
            ),
          ],
        ),
        const SizedBox(height: 16),

        Flexible(
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_custom)
                  _buildCustomPicker(context)
                else
                  _buildNativeFlow(context),
                const SizedBox(height: 16),

                // Per-share video settings (defaults from settings).
                ScreenShareQualityFields(
                  mode: _mode,
                  customQuality: _quality,
                  customFps: _fps,
                  bitrateKbps: _bitrateKbps,
                  isPremium: widget.isPremium,
                  onModeChanged: (v) {
                    setState(() {
                      _mode = v;
                      _updateBitrateForSelection(forceDefault: true);
                    });
                    _syncPreviewOptions();
                  },
                  onQualityChanged: (v) {
                    setState(() {
                      _quality = v;
                      _updateBitrateForSelection(forceDefault: true);
                    });
                    _syncPreviewOptions();
                  },
                  onFpsChanged: (v) {
                    setState(() {
                      _fps = v;
                      _updateBitrateForSelection(forceDefault: true);
                    });
                    _syncPreviewOptions();
                  },
                  onBitrateChanged: (v) {
                    setState(() {
                      _userCustomizedBitrate = true;
                      _bitrateKbps = v;
                    });
                    _syncPreviewOptions();
                  },
                ),
                const SizedBox(height: 12),

                // Audio toggle row (only for full screens).
                if (_custom ? _selectedType == ScreenShareType.screen : true)
                  Row(
                    children: [
                      Checkbox(
                        value: _includeAudio,
                        onChanged: (val) =>
                            setState(() => _includeAudio = val ?? false),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        l10n.screenShareIncludeSystemAudio,
                        style: TextStyle(
                          fontSize: 14,
                          color: colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Bottom Buttons
        Row(
          children: [
            Expanded(
              child: AppButton(label: l10n.cancel, onPressed: _cancel),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AppButton(
                label: l10n.screenShareStart,
                onPressed: _canStart
                    ? () => _popResult(
                        ScreenShareSetupResult(
                          source: _selectedSource,
                          type: _selectedType,
                          includeAudio: _includeAudio,
                          config: _draft,
                          previewVideoTrack: _previewVideo,
                          previewAudioTracks: _previewAudio,
                        ),
                      )
                    : null,
              ),
            ),
          ],
        ),
      ],
    );
  }

  bool get _canStart =>
      (_custom ? _selectedSource != null : _previewVideo != null) &&
      (!_isCustomMode || _bitrateError == CommsBitrateError.none);

  Widget _buildCustomPicker(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: SegmentedSwitch<ScreenShareType>(
            value: _selectedType,
            segmentMinWidth: 140,
            options: [
              SegmentedOption<ScreenShareType>(
                value: ScreenShareType.screen,
                label: l10n.screenShareEntireScreen,
                icon: const Icon(Icons.monitor_rounded, size: 18),
              ),
              SegmentedOption<ScreenShareType>(
                value: ScreenShareType.window,
                label: l10n.screenShareWindow,
                icon: const Icon(Icons.window_rounded, size: 18),
              ),
            ],
            onChanged: _onTypeChanged,
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 340,
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _sources.isEmpty
              ? Center(
                  child: Text(
                    _selectedType == ScreenShareType.screen
                        ? l10n.screenShareNoScreensDetected
                        : l10n.screenShareNoWindowsDetected,
                    style: TextStyle(color: colorScheme.onSurfaceVariant),
                  ),
                )
              : GridView.builder(
                  itemCount: _sources.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 16 / 11,
                  ),
                  itemBuilder: (context, index) {
                    final source = _sources[index];
                    final isSelected = _selectedSource?.id == source.id;

                    return InkWell(
                      onTap: () => setState(() => _selectedSource = source),
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected
                                ? colorScheme.primary
                                : colorScheme.outline.withValues(alpha: 0.12),
                            width: isSelected ? 2.5 : 1,
                          ),
                          color: colorScheme.surfaceContainerHighest.withValues(
                            alpha: 0.35,
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              child:
                                  source.thumbnail != null &&
                                      source.thumbnail!.isNotEmpty
                                  ? Image.memory(
                                      source.thumbnail!,
                                      fit: BoxFit.cover,
                                    )
                                  : Container(
                                      color: Colors.black26,
                                      child: Center(
                                        child: Icon(
                                          _selectedType ==
                                                  ScreenShareType.screen
                                              ? Icons.monitor_rounded
                                              : Icons.window_rounded,
                                          color: Colors.white54,
                                          size: 32,
                                        ),
                                      ),
                                    ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 8,
                              ),
                              child: Text(
                                source.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: isSelected
                                      ? FontWeight.w700
                                      : FontWeight.w500,
                                  color: isSelected
                                      ? colorScheme.primary
                                      : colorScheme.onSurface,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _buildNativeFlow(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l10n.screenSharePreview,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          height: 260,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.12),
            ),
            color: Colors.black,
          ),
          clipBehavior: Clip.antiAlias,
          child: _captureLoading
              ? const Center(child: CircularProgressIndicator())
              : _captureFailed || _previewVideo == null
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
                          l10n.screenShareCaptureFailed,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 12),
                        AppButton(
                          label: l10n.screenShareRetry,
                          onPressed: _requestCapture,
                        ),
                      ],
                    ),
                  ),
                )
              : VideoTrackRenderer(_previewVideo!, fit: VideoViewFit.cover),
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton.icon(
            onPressed: _captureLoading ? null : _requestCapture,
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: Text(l10n.screenShareChangeSource),
          ),
        ),
      ],
    );
  }
}
