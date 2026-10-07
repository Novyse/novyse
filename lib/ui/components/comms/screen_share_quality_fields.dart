import 'package:flutter/material.dart';
import 'package:novyse/core/comms/devices/comms_media_constraints.dart';
import 'package:novyse/core/comms/devices/comms_quality_options.dart';
import 'package:novyse/core/l10n/l10n.dart';

/// Quality selectors shared by the screen-share setup menu and the
/// per-share edit menu.
class ScreenShareQualityFields extends StatelessWidget {
  final String mode;
  final String customQuality;
  final String customFps;
  final ValueChanged<String> onModeChanged;
  final ValueChanged<String> onQualityChanged;
  final ValueChanged<String> onFpsChanged;

  const ScreenShareQualityFields({
    super.key,
    required this.mode,
    required this.customQuality,
    required this.customFps,
    required this.onModeChanged,
    required this.onQualityChanged,
    required this.onFpsChanged,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        DropdownButtonFormField<String>(
          initialValue: CommsMediaConstraints.resolveShareMode(mode),
          decoration: InputDecoration(
            labelText: l10n.settingsItemShareQualityTitle,
            border: const OutlineInputBorder(),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 10,
            ),
          ),
          items: [
            for (final id in CommsQualityOptions.shareModes)
              DropdownMenuItem(
                value: id,
                child: Text(CommsQualityOptions.shareModeLabel(l10n, id)),
              ),
          ],
          onChanged: (v) {
            if (v != null) onModeChanged(v);
          },
        ),
        if (CommsMediaConstraints.resolveShareMode(mode) ==
            CommsMediaConstraints.shareCustom) ...[
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _qualityOrDefault(customQuality),
            decoration: InputDecoration(
              labelText: l10n.settingsItemShareCustomQualityTitle,
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
            ),
            items: [
              for (final id in CommsQualityOptions.shareCustomQualities)
                if (!CommsQualityOptions.disabledShareCustomQualities.contains(
                  id,
                ))
                  DropdownMenuItem(
                    value: id,
                    child: Text(CommsQualityOptions.qualityLabel(l10n, id)),
                  ),
            ],
            onChanged: (v) {
              if (v != null) onQualityChanged(v);
            },
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _fpsOrDefault(customFps),
            decoration: InputDecoration(
              labelText: l10n.settingsItemShareCustomFpsTitle,
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
            ),
            items: [
              for (final id in CommsQualityOptions.fpsValues)
                DropdownMenuItem(
                  value: id,
                  child: Text(CommsQualityOptions.fpsLabel(l10n, id)),
                ),
            ],
            onChanged: (v) {
              if (v != null) onFpsChanged(v);
            },
          ),
        ],
      ],
    );
  }

  static String _qualityOrDefault(String q) {
    final available = CommsQualityOptions.shareCustomQualities
        .where(
          (id) =>
              !CommsQualityOptions.disabledShareCustomQualities.contains(id),
        )
        .toSet();
    final resolved = CommsMediaConstraints.resolveVideoQuality(q);
    if (available.contains(resolved)) return resolved;
    return CommsMediaConstraints.defaultShareCustomQuality;
  }

  static String _fpsOrDefault(String fps) {
    if (CommsQualityOptions.fpsValues.contains(fps)) return fps;
    return CommsMediaConstraints.defaultShareCustomFps;
  }
}
