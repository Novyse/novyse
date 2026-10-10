import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/comms_audio.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Linear per-user volume slider
class CommsVolumeControl extends ConsumerStatefulWidget {
  final String volKey;

  /// Whether changes are saved to local settings. Pass false for ephemeral
  /// keys such as screen-share track SIDs.
  final bool persist;

  const CommsVolumeControl({
    super.key,
    required this.volKey,
    this.persist = true,
  });

  @override
  ConsumerState<CommsVolumeControl> createState() => _CommsVolumeControlState();
}

class _CommsVolumeControlState extends ConsumerState<CommsVolumeControl> {
  double? _dragValue;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final stored =
        ref.watch(
          commsProvider.select((s) => s.remoteVolumes[widget.volKey]),
        ) ??
        1.0;
    final value = _dragValue ?? stored;
    final percent = (CommsAudio.clampVolume(value) * 100).round();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              AppHugeIcon(
                icon: percent == 0
                    ? HugeIcons.strokeRoundedVolumeOff
                    : HugeIcons.strokeRoundedVolumeHigh,
                size: 20,
              ),
              const SizedBox(width: 10),
              Text(
                l10n.commsVolume,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const Spacer(),
              Text(
                '$percent%',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          Slider(
            value: CommsAudio.clampVolume(value),
            max: CommsAudio.maxVolume,
            divisions: 200,
            label: '$percent%',
            onChanged: (v) {
              setState(() => _dragValue = v);
              // Live apply while dragging, without awaiting (fire-and-forget).
              ref
                  .read(commsProvider.notifier)
                  .setRemoteVolume(widget.volKey, v, persist: widget.persist);
            },
            onChangeEnd: (v) {
              setState(() => _dragValue = null);
              ref
                  .read(commsProvider.notifier)
                  .setRemoteVolume(widget.volKey, v, persist: widget.persist);
            },
          ),
        ],
      ),
    );
  }
}
