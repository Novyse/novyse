import 'package:flutter/material.dart';
import 'package:novyse/core/comms/devices/comms_bitrate_options.dart';
import 'package:novyse/core/comms/devices/comms_media_constraints.dart';
import 'package:novyse/core/comms/devices/comms_quality_options.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/number/number_stepper.dart';
import 'package:novyse/ui/components/switch/segmented_switch.dart';

/// Quality selectors shared by the screen-share setup menu and the
/// per-share edit menu.
class ScreenShareQualityFields extends StatelessWidget {
  final String mode;
  final String customQuality;
  final String customFps;
  final int? bitrateKbps;
  final bool isPremium;
  final String? customBitrateError;
  final ValueChanged<String> onModeChanged;
  final ValueChanged<String> onQualityChanged;
  final ValueChanged<String> onFpsChanged;
  final ValueChanged<int>? onBitrateChanged;

  const ScreenShareQualityFields({
    super.key,
    required this.mode,
    required this.customQuality,
    required this.customFps,
    this.bitrateKbps,
    this.isPremium = false,
    this.customBitrateError,
    required this.onModeChanged,
    required this.onQualityChanged,
    required this.onFpsChanged,
    this.onBitrateChanged,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final isCustom = CommsMediaConstraints.resolveShareMode(mode) ==
        CommsMediaConstraints.shareCustom;

    final resolvedQuality = _qualityOrDefault(customQuality);
    final resolvedFps = CommsMediaConstraints.resolveVideoFps(
      '',
      _fpsOrDefault(customFps),
    );
    final range = CommsBitrateOptions.rangeFor(
      resolvedFps,
      quality: resolvedQuality,
    );
    final currentBitrate = _bitrateOrDefault(
      bitrateKbps,
      quality: customQuality,
      fps: customFps,
    );
    final bitrateError = CommsBitrateOptions.validate(
      kbps: currentBitrate,
      fps: resolvedFps,
      quality: resolvedQuality,
      isPremium: isPremium,
    );
    final errorText = customBitrateError ??
        switch (bitrateError) {
          CommsBitrateError.none ||
          CommsBitrateError.belowMin ||
          CommsBitrateError.aboveMax =>
            null,
          CommsBitrateError.premiumLimit =>
            l10n.screenShareBitratePremiumLimitError,
        };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        SegmentedSwitch<String>(
          label: l10n.settingsItemShareQualityTitle,
          value: CommsMediaConstraints.resolveShareMode(mode),
          segmentMinWidth: 75,
          options: [
            for (final id in CommsQualityOptions.shareModes)
              SegmentedOption<String>(
                value: id,
                label: CommsQualityOptions.shareModeLabel(l10n, id),
              ),
          ],
          onChanged: onModeChanged,
        ),
        if (isCustom) ...[
          const SizedBox(height: 12),
          SegmentedSwitch<String>(
            label: l10n.settingsItemShareCustomQualityTitle,
            value: resolvedQuality,
            segmentMinWidth: 75,
            options: [
              for (final id in CommsQualityOptions.shareCustomQualities)
                SegmentedOption<String>(
                  value: id,
                  label: CommsQualityOptions.qualityLabel(l10n, id),
                  enabled: !CommsQualityOptions.disabledShareCustomQualities
                      .contains(id),
                ),
            ],
            onChanged: onQualityChanged,
          ),
          const SizedBox(height: 12),
          SegmentedSwitch<String>(
            label: l10n.settingsItemShareCustomFpsTitle,
            value: _fpsOrDefault(customFps),
            segmentMinWidth: 65,
            options: [
              for (final id in CommsQualityOptions.fpsValues)
                SegmentedOption<String>(
                  value: id,
                  label: CommsQualityOptions.fpsLabel(l10n, id),
                ),
            ],
            onChanged: onFpsChanged,
          ),
          if (onBitrateChanged != null) ...[
            const SizedBox(height: 12),
            Text(
              l10n.screenShareBitrateLabel,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurfaceVariant,
              ),
            ),
            NumberStepper(
              value: currentBitrate.toDouble(),
              step: CommsBitrateOptions.stepKbps.toDouble(),
              min: range.minKbps.toDouble(),
              max: range.maxKbps.toDouble(),
              onChanged: (v) => onBitrateChanged!(v.round()),
            ),
            if (errorText != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  errorText,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: colorScheme.error),
                ),
              ),
          ],
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

  static int _bitrateOrDefault(
    int? bitrate, {
    required String quality,
    required String fps,
  }) {
    final resolvedQuality = _qualityOrDefault(quality);
    final resolvedFps = CommsMediaConstraints.resolveVideoFps(
      '',
      _fpsOrDefault(fps),
    );
    final range = CommsBitrateOptions.rangeFor(
      resolvedFps,
      quality: resolvedQuality,
    );
    if (bitrate != null &&
        bitrate >= range.minKbps &&
        bitrate <= range.maxKbps) {
      return bitrate;
    }
    return range.defaultKbps;
  }

  static int bitrateOrDefault(
    int? bitrate, {
    required String quality,
    required String fps,
  }) => _bitrateOrDefault(bitrate, quality: quality, fps: fps);
}
