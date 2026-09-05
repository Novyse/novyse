import 'dart:io' as io;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/themes/themes.dart';

enum ScreenShareType { screen, window }

class ScreenShareSelectionResult {
  final DesktopCapturerSource? source;
  final ScreenShareType type;
  final bool includeAudio;

  const ScreenShareSelectionResult({
    this.source,
    required this.type,
    required this.includeAudio,
  });
}

/// Custom modal dialog allowing desktop users to pick a specific screen or window to share.
class ScreenShareSelectorModal extends StatefulWidget {
  const ScreenShareSelectorModal({super.key});

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

  static Future<ScreenShareSelectionResult?> show(BuildContext context) {
    return showDialog<ScreenShareSelectionResult>(
      context: context,
      barrierDismissible: true,
      builder: (context) => const ScreenShareSelectorModal(),
    );
  }

  @override
  State<ScreenShareSelectorModal> createState() =>
      _ScreenShareSelectorModalState();
}

class _ScreenShareSelectorModalState extends State<ScreenShareSelectorModal> {
  ScreenShareType _selectedType = ScreenShareType.screen;
  List<DesktopCapturerSource> _sources = [];
  DesktopCapturerSource? _selectedSource;
  bool _includeAudio = false;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadSources();
  }

  Future<void> _loadSources() async {
    if (ScreenShareSelectorModal.hasNativePicker) {
      setState(() {
        _loading = false;
        _sources = [];
      });
      return;
    }

    if (kIsWeb ||
        (!io.Platform.isLinux &&
            !io.Platform.isMacOS &&
            !io.Platform.isWindows)) {
      setState(() {
        _loading = false;
      });
      return;
    }

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
    if (!ScreenShareSelectorModal.hasNativePicker) {
      _loadSources();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    return Dialog(
      backgroundColor: colorScheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 620, maxHeight: 640),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.screenShareModalTitle,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Segmented switch for Screen / Window
              Center(
                child: SegmentedButton<ScreenShareType>(
                  segments: [
                    ButtonSegment(
                      value: ScreenShareType.screen,
                      label: Text(l10n.screenShareEntireScreen),
                      icon: const Icon(Icons.monitor_rounded, size: 18),
                    ),
                    ButtonSegment(
                      value: ScreenShareType.window,
                      label: Text(l10n.screenShareWindow),
                      icon: const Icon(Icons.window_rounded, size: 18),
                    ),
                  ],
                  selected: {_selectedType},
                  onSelectionChanged: (set) => _onTypeChanged(set.first),
                  style: SegmentedButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Source Grid / Native Picker Info / Loading
              Expanded(
                child: ScreenShareSelectorModal.hasNativePicker
                    ? Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 24,
                            vertical: 32,
                          ),
                          decoration: BoxDecoration(
                            color: colorScheme.surfaceContainerHighest
                                .withValues(alpha: 0.35),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: colorScheme.outline.withValues(
                                alpha: 0.15,
                              ),
                            ),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                _selectedType == ScreenShareType.screen
                                    ? Icons.monitor_rounded
                                    : Icons.window_rounded,
                                size: 56,
                                color: AppColors.primary,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                _selectedType == ScreenShareType.screen
                                    ? l10n.screenShareEntireScreenTitle
                                    : l10n.screenShareWindowSharingTitle,
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: colorScheme.onSurface,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                l10n.screenShareNativePickerNotice,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: colorScheme.onSurfaceVariant,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : _loading
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
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                              childAspectRatio: 16 / 11,
                            ),
                        itemBuilder: (context, index) {
                          final source = _sources[index];
                          final isSelected = _selectedSource?.id == source.id;

                          return InkWell(
                            onTap: () =>
                                setState(() => _selectedSource = source),
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isSelected
                                      ? AppColors.primary
                                      : colorScheme.outline.withValues(
                                          alpha: 0.3,
                                        ),
                                  width: isSelected ? 2.5 : 1,
                                ),
                                color: colorScheme.surfaceContainerHighest
                                    .withValues(alpha: 0.35),
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
                                            ? AppColors.primary
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

              // Audio toggle row (only for full screens)
              if (_selectedType == ScreenShareType.screen)
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
              const SizedBox(height: 16),

              // Bottom Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(
                      l10n.cancel,
                      style: TextStyle(color: colorScheme.onSurfaceVariant),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed:
                        (ScreenShareSelectorModal.hasNativePicker ||
                            _selectedSource != null)
                        ? () {
                            Navigator.of(context).pop(
                              ScreenShareSelectionResult(
                                source: _selectedSource,
                                type: _selectedType,
                                includeAudio: _includeAudio,
                              ),
                            );
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                    ),
                    child: Text(
                      l10n.screenShareStart,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
