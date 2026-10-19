import 'package:flutter/material.dart';
import 'package:novyse/ui/components/waveform/waveform_view.dart';

/// Live recording waveform.
///
/// Samples are normalized levels in the `0..1` range. The waveform scrolls
/// from right to left as the recorder appends new samples.
class SpeechIndicator extends StatelessWidget {
  const SpeechIndicator({
    super.key,
    required this.samples,
    this.height = 22.0,
    this.barWidth = 3.0,
    this.barGap = 2.5,
    this.color,
  });

  final List<double> samples;
  final double height;
  final double barWidth;
  final double barGap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return WaveformView(
      samples: samples,
      activeColor: color ?? scheme.primary,
      emptyColor: scheme.onSurfaceVariant.withValues(alpha: 0.25),
      height: height,
      fit: false,
      barWidth: barWidth,
      barGap: barGap,
      maxBarHeightFactor: 0.85,
    );
  }
}
