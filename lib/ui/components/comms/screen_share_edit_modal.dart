import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:novyse/core/comms/comms_share_config.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/comms/screen_share_selector_modal.dart';
import 'package:novyse/ui/components/comms/screen_share_source_picker.dart';
import 'package:novyse/ui/components/comms/screen_share_source_preview.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';

/// Outcome of the per-share edit menu: source and audio only.
class ScreenShareEditResult {
  final ScreenShareConfig config;
  final String? newSourceId;
  final bool? audioEnabled;
  final bool repickSource;

  const ScreenShareEditResult({
    required this.config,
    this.newSourceId,
    this.audioEnabled,
    this.repickSource = false,
  });
}


class ScreenShareEditModal extends StatefulWidget {
  final ScreenShareConfig current;
  final bool hasAudio;
  final String? currentSourceId;
  final String? currentActive;

  const ScreenShareEditModal({
    super.key,
    required this.current,
    required this.hasAudio,
    this.currentSourceId,
    this.currentActive,
  });

  bool get customPicker => ScreenShareSelectorModal.useCustomPicker;

  static Future<ScreenShareEditResult?> show(
    BuildContext context, {
    required ScreenShareConfig current,
    required bool hasAudio,
    String? currentSourceId,
    String? currentActive,
  }) {
    return ResponsiveOverlay.show<ScreenShareEditResult>(
      context: context,
      title: AppLocalizations.of(context)!.screenShareEditTitle,
      mode: ResponsiveOverlayMode.modal,
      maxWidth: 560,
      child: ScreenShareEditModal(
        current: current,
        hasAudio: hasAudio,
        currentSourceId: currentSourceId,
        currentActive: currentActive,
      ),
    );
  }

  @override
  State<ScreenShareEditModal> createState() => _ScreenShareEditModalState();
}

class _ScreenShareEditModalState extends State<ScreenShareEditModal> {
  late bool _audio = widget.hasAudio;
  String? _selectedSourceId;
  bool _sourceTouched = false;

  List<DesktopCapturerSource> _sources = [];
  bool _loadingSources = false;

  @override
  void initState() {
    super.initState();
    if (widget.customPicker) _loadSources();
  }

  Future<void> _loadSources() async {
    setState(() => _loadingSources = true);
    try {
      final sources = await desktopCapturer.getSources(
        types: [SourceType.Screen, SourceType.Window],
      );
      if (mounted) {
        setState(() {
          _sources = sources;
          _loadingSources = false;
        });
      }
    } catch (e) {
      debugPrint('[ScreenShareEdit] Error loading desktop sources: $e');
      if (mounted) setState(() => _loadingSources = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    // Body only: title bar, padding and scrolling come from OverlayDialog via
    // ResponsiveOverlay.show(), so no inner scroll view here.
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.customPicker)
          _buildSourceSection(context)
        else
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () => Navigator.of(
                context,
                rootNavigator: true,
              ).pop(
                ScreenShareEditResult(
                  config: widget.current,
                  repickSource: true,
                ),
              ),
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: Text(l10n.screenShareChangeSource),
            ),
          ),
        const SizedBox(height: 12),
        Row(
          children: [
            Checkbox(
              value: _audio,
              onChanged: (val) => setState(() => _audio = val ?? false),
            ),
            const SizedBox(width: 4),
            Text(
              l10n.screenShareIncludeSystemAudio,
              style: TextStyle(fontSize: 14, color: colorScheme.onSurface),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: AppButton(
                label: l10n.cancel,
                onPressed: () =>
                    Navigator.of(context, rootNavigator: true).pop(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AppButton(
                label: l10n.screenShareApply,
                onPressed: () {
                  String? newSourceId;
                  if (_sourceTouched &&
                      _selectedSourceId != null &&
                      _selectedSourceId != widget.currentSourceId) {
                    newSourceId = _selectedSourceId;
                  }
                  Navigator.of(context, rootNavigator: true).pop(
                    ScreenShareEditResult(
                      config: widget.current,
                      newSourceId: newSourceId,
                      audioEnabled: _audio == widget.hasAudio ? null : _audio,
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSourceSection(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final effectiveId = _sourceTouched
        ? _selectedSourceId
        : widget.currentActive ?? widget.currentSourceId;
    DesktopCapturerSource? activeSource;
    if (effectiveId != null) {
      for (final s in _sources) {
        if (s.id == effectiveId) {
          activeSource = s;
          break;
        }
      }
    }
    if (_loadingSources) {
      return const Center(child: CircularProgressIndicator());
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          l10n.screenSharePreview,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 8),
        if (activeSource != null)
          ScreenShareSourcePreview(
            source: activeSource,
            type: activeSource.type == SourceType.Window
                ? ScreenShareType.window
                : ScreenShareType.screen,
            releaseOnDispose: true,
            height: 200,
          )
        else if (_sources.isEmpty)
          Center(
            child: Text(
              l10n.screenShareNoSourcesDetected,
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        const SizedBox(height: 12),
        if (_sources.isNotEmpty)
          ScreenShareSourcePicker(
            sources: _sources,
            selectedId: effectiveId,
            onChanged: (v) => setState(() {
              _selectedSourceId = v;
              _sourceTouched = true;
            }),
          ),
      ],
    );
  }
}
