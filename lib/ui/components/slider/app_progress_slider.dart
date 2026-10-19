import 'package:flutter/material.dart';

/// Generic seekable progress control used by the active-voice bar and by
/// voice/audio message bubbles.
///
/// - [waveform] null → linear [Slider]
/// - [waveform] set → seekable waveform bars
/// - [onSeek] null → display only (slider disabled).
class AppProgressSlider extends StatelessWidget {
  const AppProgressSlider({
    super.key,
    required this.positionMs,
    required this.totalMs,
    this.onSeek,
    this.onSeekStart,
    this.onSeekEnd,
    this.waveform,
    this.height = 20,
    this.waveformHeight = 35,
    this.activeColor,
    this.inactiveColor,
    this.thumbRadius = 6,
  });

  final double positionMs;
  final double totalMs;
  final ValueChanged<double>? onSeek;
  final VoidCallback? onSeekStart;
  final VoidCallback? onSeekEnd;
  final List<double>? waveform;
  final double height;
  final double waveformHeight;
  final Color? activeColor;
  final Color? inactiveColor;
  final double thumbRadius;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (waveform != null) {
      return _SeekableWaveform(
        waveformData: waveform!,
        positionMs: positionMs,
        totalMs: totalMs,
        onSeek: onSeek,
        onSeekStart: onSeekStart,
        onSeekEnd: onSeekEnd,
        height: waveformHeight,
        activeColor: activeColor ?? scheme.primary,
        inactiveColor:
            inactiveColor ?? scheme.onSurfaceVariant.withValues(alpha: 0.4),
      );
    }

    final max = totalMs > 0 ? totalMs : 1.0;
    return SizedBox(
      height: height,
      child: SliderTheme(
        data: SliderThemeData(
          trackHeight: 3,
          thumbShape: RoundSliderThumbShape(enabledThumbRadius: thumbRadius),
          overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
          activeTrackColor: activeColor ?? scheme.primary,
          inactiveTrackColor: inactiveColor ?? scheme.surfaceContainerHighest,
          thumbColor: activeColor ?? scheme.primary,
        ),
        child: Slider(
          value: positionMs.clamp(0, max),
          max: max,
          onChangeStart: onSeek == null ? null : (_) => onSeekStart?.call(),
          onChanged: onSeek,
          onChangeEnd: onSeek == null ? null : (_) => onSeekEnd?.call(),
        ),
      ),
    );
  }
}

/// Waveform progress bar with tap + horizontal-drag seeking.
class _SeekableWaveform extends StatelessWidget {
  const _SeekableWaveform({
    required this.waveformData,
    required this.positionMs,
    required this.totalMs,
    required this.onSeek,
    required this.onSeekStart,
    required this.onSeekEnd,
    required this.height,
    required this.activeColor,
    required this.inactiveColor,
  });

  final List<double> waveformData;
  final double positionMs;
  final double totalMs;
  final ValueChanged<double>? onSeek;
  final VoidCallback? onSeekStart;
  final VoidCallback? onSeekEnd;
  final double height;
  final Color activeColor;
  final Color inactiveColor;

  void _seekAt(Offset localPosition, double width) {
    final seek = onSeek;
    if (seek == null || width <= 0) return;
    final fraction = (localPosition.dx / width).clamp(0.0, 1.0);
    seek(fraction * (totalMs > 0 ? totalMs : 1.0));
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final w = constraints.maxWidth.isFinite && constraints.maxWidth > 0
            ? constraints.maxWidth
            : 160.0;
        return Listener(
          onPointerDown: (_) {
            if (onSeek != null) onSeekStart?.call();
          },
          onPointerUp: (_) => onSeekEnd?.call(),
          onPointerCancel: (_) => onSeekEnd?.call(),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTapDown: (details) => _seekAt(details.localPosition, w),
            onHorizontalDragStart: (details) =>
                _seekAt(details.localPosition, w),
            onHorizontalDragUpdate: (details) =>
                _seekAt(details.localPosition, w),
            child: CustomPaint(
              size: Size(w, height),
              painter: _WaveformProgressPainter(
                waveformData: waveformData,
                currentValue: positionMs,
                maxValue: totalMs,
                activeColor: activeColor,
                inactiveColor: inactiveColor,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _WaveformProgressPainter extends CustomPainter {
  _WaveformProgressPainter({
    required this.waveformData,
    required this.currentValue,
    required this.maxValue,
    required this.activeColor,
    required this.inactiveColor,
  });

  final List<double> waveformData;
  final double currentValue;
  final double maxValue;
  final Color activeColor;
  final Color inactiveColor;

  @override
  void paint(Canvas canvas, Size size) {
    if (!size.width.isFinite ||
        !size.height.isFinite ||
        size.width <= 0 ||
        size.height <= 0 ||
        waveformData.isEmpty) {
      return;
    }

    final barWidth = size.width / waveformData.length;
    final gap = barWidth * 0.2;
    final actualBarWidth = barWidth - gap;
    final centerY = size.height / 2;
    final maxBarHeight = size.height * 0.85;

    final progress = maxValue > 0
        ? (currentValue / maxValue).clamp(0.0, 1.0)
        : 0.0;
    final activeBars = (progress * waveformData.length).floor();

    final paint = Paint()..strokeCap = StrokeCap.round;

    for (var i = 0; i < waveformData.length; i++) {
      final x = i * barWidth + gap / 2;
      final amplitude = waveformData[i].clamp(0.05, 1.0);
      final barHeight = amplitude * maxBarHeight;

      paint.color = i < activeBars ? activeColor : inactiveColor;
      paint.strokeWidth = actualBarWidth.clamp(1.5, 4.0);

      canvas.drawLine(
        Offset(x + actualBarWidth / 2, centerY - barHeight / 2),
        Offset(x + actualBarWidth / 2, centerY + barHeight / 2),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _WaveformProgressPainter oldDelegate) {
    return oldDelegate.currentValue != currentValue ||
        oldDelegate.maxValue != maxValue ||
        oldDelegate.waveformData != waveformData ||
        oldDelegate.activeColor != activeColor ||
        oldDelegate.inactiveColor != inactiveColor;
  }
}
