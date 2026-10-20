import 'package:flutter/material.dart';

/// Sender + position/duration + provenance texts of the active-voice bar.
class VoiceBarMeta extends StatelessWidget {
  const VoiceBarMeta({
    super.key,
    required this.senderName,
    required this.positionLabel,
    required this.durationLabel,
    this.provenance,
  });

  final String senderName;
  final String positionLabel;
  final String durationLabel;
  final String? provenance;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final time = '$positionLabel / $durationLabel';
    final subtitle = (provenance != null && provenance!.isNotEmpty)
        ? '$time • $provenance'
        : time;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          senderName,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: scheme.onSurface,
          ),
        ),
        const SizedBox(height: 1),
        Text(
          subtitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
            color: scheme.onSurfaceVariant,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}
