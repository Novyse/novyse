import 'package:flutter/material.dart';

class SpeechIndicator extends StatelessWidget {
  const SpeechIndicator({
    super.key,
    required this.audioLevel,
    this.barWidth = 3.0,
    this.maxHeight = 28.0,
    this.color,
  });

  final double audioLevel; // In dB, e.g. -60 to 0
  final double barWidth;
  final double maxHeight;
  final Color? color;

  static const double minDb = -60.0;
  static const double maxDb = 0.0;

  static const List<double> barScales = [0.4, 0.8, 1.0, 0.8, 0.4];

  @override
  Widget build(BuildContext context) {
    var normalized = 0.0;
    if (audioLevel > minDb) {
      normalized = (audioLevel - minDb) / (maxDb - minDb);
    }
    normalized = normalized.clamp(0.0, 1.0);

    final barColor = color ?? Theme.of(context).colorScheme.onSurface;

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: List.generate(barScales.length, (index) {
        final scale = barScales[index];
        final targetHeight = (barWidth + (maxHeight * scale - barWidth) * normalized).clamp(barWidth, maxHeight);

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 2.5),
          child: TweenAnimationBuilder<double>(
            tween: Tween<double>(begin: barWidth, end: targetHeight),
            duration: const Duration(milliseconds: 100),
            curve: Curves.easeOutCubic,
            builder: (context, height, _) {
              return Container(
                width: barWidth,
                height: height,
                decoration: BoxDecoration(
                  color: barColor,
                  borderRadius: BorderRadius.circular(barWidth / 2),
                ),
              );
            },
          ),
        );
      }),
    );
  }
}
