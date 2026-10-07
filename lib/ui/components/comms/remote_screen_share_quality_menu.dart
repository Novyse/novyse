import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/devices/comms_media_constraints.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu_divider.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu_item.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Represents a selectable stream quality option for a remote screen share.
class RemoteQualityOption {
  final String id;
  final String label;
  final int? height;
  final int? width;

  const RemoteQualityOption({
    required this.id,
    required this.label,
    this.height,
    this.width,
  });

  /// Resolves the actual published qualities for a remote screen-share publication.
  /// Always includes 'auto' first, followed by the real published layers (e.g. 1080p, 720p, 480p).
  static List<RemoteQualityOption> resolveOptions({
    required RemoteTrackPublication? pub,
    required AppLocalizations l10n,
  }) {
    final options = <RemoteQualityOption>[
      RemoteQualityOption(
        id: 'auto',
        label: l10n.screenShareQualityAuto,
      ),
    ];

    int? highH;
    int? medH;
    int? lowH;
    int? highW;
    int? medW;
    int? lowW;

    // 1. Inspect codecs[...].layers (LiveKit multi-codec proto format)
    try {
      // ignore: invalid_use_of_internal_member
      final codecs = pub?.latestInfo?.codecs;
      if (codecs != null && codecs.isNotEmpty) {
        for (final codec in codecs) {
          for (final l in codec.layers) {
            final h = l.height;
            if (h <= 0) continue;
            final vq = l.quality.name;
            if (vq == 'HIGH' && highH == null) {
              highH = h;
              if (l.width > 0) highW = l.width;
            } else if (vq == 'MEDIUM' && medH == null) {
              medH = h;
              if (l.width > 0) medW = l.width;
            } else if (vq == 'LOW' && lowH == null) {
              lowH = h;
              if (l.width > 0) lowW = l.width;
            }
          }
        }
      }
    } catch (_) {}

    // 2. Inspect latestInfo.layers (classic LiveKit proto format)
    if (highH == null || medH == null || lowH == null) {
      try {
        // ignore: invalid_use_of_internal_member, deprecated_member_use
        final layers = pub?.latestInfo?.layers;
        if (layers != null && layers.isNotEmpty) {
          for (final l in layers) {
            final h = l.height;
            if (h <= 0) continue;
            final vq = l.quality.name;
            if (vq == 'HIGH' && highH == null) {
              highH = h;
              if (l.width > 0) highW = l.width;
            } else if (vq == 'MEDIUM' && medH == null) {
              medH = h;
              if (l.width > 0) medW = l.width;
            } else if (vq == 'LOW' && lowH == null) {
              lowH = h;
              if (l.width > 0) lowW = l.width;
            }
          }
        }
      } catch (_) {}
    }

    // 3. If track height is available from latestInfo.height and highH was not set, use it.
    try {
      // ignore: invalid_use_of_internal_member
      final trackH = pub?.latestInfo?.height ?? 0;
      if (trackH > 0 && (highH == null || trackH > highH)) {
        highH = trackH;
      }
    } catch (_) {}

    // 4. Fallback: if layers weren't populated in metadata, deduce cascade from top height
    if (highH == null && medH == null && lowH == null) {
      int topH = 0;
      try {
        // ignore: invalid_use_of_internal_member
        topH = pub?.latestInfo?.height ?? 0;
      } catch (_) {}
      if (topH <= 0) {
        final track = pub?.track;
        if (track is RemoteVideoTrack) {
          try {
            final s = track.mediaStreamTrack.getSettings();
            if (s['height'] is int) topH = s['height'] as int;
          } catch (_) {}
        }
      }

      final (medQuality, lowQuality) = switch (topH) {
        >= 2160 => (
            CommsMediaConstraints.video2k,
            CommsMediaConstraints.video1080p
          ),
        >= 1440 => (
            CommsMediaConstraints.video1080p,
            CommsMediaConstraints.video720p
          ),
        >= 1080 => (
            CommsMediaConstraints.video720p,
            CommsMediaConstraints.video480p
          ),
        >= 720 => (
            CommsMediaConstraints.video480p,
            CommsMediaConstraints.video360p
          ),
        >= 480 => (
            CommsMediaConstraints.video360p,
            CommsMediaConstraints.video240p
          ),
        _ => (
            CommsMediaConstraints.video720p,
            CommsMediaConstraints.video480p
          ),
      };

      highH = topH > 0 ? topH : 1080;
      medH = CommsMediaConstraints.dimensionsFor(medQuality).height;
      lowH = CommsMediaConstraints.dimensionsFor(lowQuality).height;
    }

    final rawLayers = <(String id, int h, int? w)>[];
    if (highH != null) rawLayers.add(('high', highH, highW));
    if (medH != null) rawLayers.add(('medium', medH, medW));
    if (lowH != null) rawLayers.add(('low', lowH, lowW));

    // Deduplicate by formatted resolution: if two layers map to the same resolution
    // (e.g. 1080p and 1080p), keep only the first/highest priority layer.
    final seenLabels = <String>{};
    for (final layer in rawLayers) {
      final label = formatResolution(layer.$2, w: layer.$3);
      if (seenLabels.add(label)) {
        options.add(
          RemoteQualityOption(
            id: layer.$1,
            label: label,
            height: layer.$2,
            width: layer.$3,
          ),
        );
      }
    }

    return options;
  }

  /// Formats a vertical height integer into a clean, standard resolution string.
  /// Includes tolerances for WebRTC macroblock and codec dimension rounding (e.g. 239 -> 240p).
  static String formatResolution(int h, {int? w}) {
    if (h >= 2140 && h <= 2180) return '4K (2160p)';
    if (h >= 1420 && h <= 1460) return '2K (1440p)';
    if (h >= 1060 && h <= 1100) return '1080p';
    if (h >= 700 && h <= 740) return '720p';
    if (h >= 460 && h <= 500) return '480p';
    if (h >= 340 && h <= 380) return '360p';
    if (h >= 220 && h <= 260) return '240p';

    if (h >= 2160) return '4K (2160p)';
    if (h >= 1440) return '2K (1440p)';
    return h > 0 ? '${h}p' : '1080p';
  }
}

/// Anchored popup menu for selecting the received quality of a remote screen share.
Future<void> showRemoteScreenShareQualityMenu({
  required BuildContext context,
  required WidgetRef ref,
  required String trackSid,
  required Offset anchor,
}) {
  final l10n = AppLocalizations.of(context)!;
  final comms = ref.read(commsProvider.notifier);
  final pub = comms.findRemoteTrackPublication(trackSid);
  final options = RemoteQualityOption.resolveOptions(
    pub: pub,
    l10n: l10n,
  );
  final current =
      ref.read(commsProvider).remoteScreenShareQualities[trackSid] ?? 'auto';

  const menuWidth = 200.0;
  final estimatedHeight = 52.0 + (options.length * 40.0);

  return showAppMenu(
    context: context,
    anchor: anchor,
    width: menuWidth,
    estimatedHeight: estimatedHeight,
    builder: (close) => _RemoteQualityMenuContent(
      current: current,
      options: options,
      onSelect: (qualityId) {
        close();
        comms.setRemoteScreenShareQuality(trackSid, qualityId);
      },
    ),
  );
}

class _RemoteQualityMenuContent extends StatelessWidget {
  final String current;
  final List<RemoteQualityOption> options;
  final ValueChanged<String> onSelect;

  const _RemoteQualityMenuContent({
    required this.current,
    required this.options,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    Widget buildOptionRow(RemoteQualityOption option) {
      final isSelected = current == option.id;
      return InkWell(
        onTap: () => onSelect(option.id),
        borderRadius: BorderRadius.circular(AppMenuTokens.borderRadius),
        hoverColor: colorScheme.onSurface.withValues(alpha: 0.08),
        splashColor: colorScheme.onSurface.withValues(alpha: 0.12),
        child: Container(
          height: AppMenuTokens.itemHeight,
          padding: const EdgeInsets.symmetric(
            horizontal: AppMenuTokens.padding,
          ),
          child: Row(
            children: [
              SizedBox(
                width: 20,
                height: 20,
                child: isSelected
                    ? AppHugeIcon(
                        icon: HugeIcons.strokeRoundedTick02,
                        size: 18,
                        color: colorScheme.primary,
                      )
                    : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  option.label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    color: isSelected
                        ? colorScheme.primary
                        : colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppMenuHeader(
          icon: HugeIcons.strokeRoundedSlidersVertical,
          label: l10n.screenShareQualityTitle,
        ),
        const AppMenuDivider(),
        for (final opt in options) buildOptionRow(opt),
      ],
    );
  }
}
