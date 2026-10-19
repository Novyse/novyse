import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Draws a waveform from normalized samples in the `0..1` range.
///
/// When [fit] is true the samples fill the available width. This is used by
/// playback sliders, where the complete waveform must fit the track.
///
/// When [fit] is false the samples scroll from right to left using a fixed
/// slot size. This is used by the live recording indicator: old samples leave
/// the left edge and new samples enter from the right.
class WaveformView extends StatefulWidget {
  const WaveformView({
    super.key,
    required this.samples,
    this.progress,
    this.activeColor,
    this.inactiveColor,
    this.emptyColor,
    this.height = 35,
    this.fit = true,
    this.barWidth = 3,
    this.barGap = 2.5,
    this.maxBarHeightFactor = 0.85,
    this.scrollDuration = const Duration(milliseconds: 60),
  });

  /// Normalized samples, where `0` is silence and `1` is the maximum level.
  final List<double> samples;

  /// Playback progress in the `0..1` range. Ignored when [fit] is false.
  ///
  /// When null every sample uses [activeColor]. This is used by the recording
  /// indicator, where there is no playback progress.
  final double? progress;

  final Color? activeColor;
  final Color? inactiveColor;

  /// Color used for the empty slots before the first samples arrive.
  final Color? emptyColor;

  final double height;

  /// Whether the samples fill the available width ([true]) or scroll using
  /// fixed slots ([false]).
  final bool fit;

  final double barWidth;
  final double barGap;
  final double maxBarHeightFactor;

  /// Duration of the horizontal scroll animation. Should match the interval
  /// at which new samples are added.
  final Duration scrollDuration;

  @override
  State<WaveformView> createState() => _WaveformViewState();
}

class _WaveformViewState extends State<WaveformView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = AnimationController(
      vsync: this,
      duration: widget.scrollDuration,
      value: 1,
    );
  }

  @override
  void didUpdateWidget(covariant WaveformView oldWidget) {
    super.didUpdateWidget(oldWidget);
    _scrollController.duration = widget.scrollDuration;

    final samplesChanged = !listEquals(oldWidget.samples, widget.samples);
    if (!widget.fit && samplesChanged && widget.samples.isNotEmpty) {
      _scrollController.forward(from: 0);
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final activeColor = widget.activeColor ?? scheme.primary;
    final inactiveColor =
        widget.inactiveColor ?? scheme.onSurfaceVariant.withValues(alpha: 0.4);
    final emptyColor =
        widget.emptyColor ?? scheme.onSurfaceVariant.withValues(alpha: 0.25);

    return AnimatedBuilder(
      animation: _scrollController,
      builder: (context, _) {
        return LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.hasBoundedWidth
                ? constraints.maxWidth
                : 0.0;

            return CustomPaint(
              size: Size(width, widget.height),
              painter: WaveformPainter(
                samples: widget.samples,
                progress: widget.progress,
                activeColor: activeColor,
                inactiveColor: inactiveColor,
                emptyColor: emptyColor,
                fit: widget.fit,
                barWidth: widget.barWidth,
                barGap: widget.barGap,
                maxBarHeightFactor: widget.maxBarHeightFactor,
                scrollProgress: _scrollController.value,
              ),
            );
          },
        );
      },
    );
  }
}

/// Paints the bars shared by the playback slider and the live recorder.
class WaveformPainter extends CustomPainter {
  WaveformPainter({
    required this.samples,
    required this.progress,
    required this.activeColor,
    required this.inactiveColor,
    required this.emptyColor,
    required this.fit,
    required this.barWidth,
    required this.barGap,
    required this.maxBarHeightFactor,
    required this.scrollProgress,
  });

  final List<double> samples;
  final double? progress;
  final Color activeColor;
  final Color inactiveColor;
  final Color emptyColor;
  final bool fit;
  final double barWidth;
  final double barGap;
  final double maxBarHeightFactor;
  final double scrollProgress;

  @override
  void paint(Canvas canvas, Size size) {
    if (!size.width.isFinite ||
        !size.height.isFinite ||
        size.width <= 0 ||
        size.height <= 0) {
      return;
    }

    canvas.clipRect(Offset.zero & size);

    if (fit) {
      _paintFit(canvas, size);
    } else {
      _paintRolling(canvas, size);
    }
  }

  void _paintFit(Canvas canvas, Size size) {
    if (samples.isEmpty) return;

    final slotWidth = size.width / samples.length;
    final gap = slotWidth * 0.2;
    final strokeWidth = (slotWidth - gap).clamp(1.5, 4.0);
    final centerY = size.height / 2;
    final maxBarHeight = size.height * maxBarHeightFactor;

    final playbackProgress = progress?.clamp(0.0, 1.0);
    final activeBars = playbackProgress == null
        ? samples.length
        : (playbackProgress * samples.length).floor();

    final paint = Paint()..strokeCap = StrokeCap.round;

    for (var i = 0; i < samples.length; i++) {
      final amplitude = samples[i].clamp(0.0, 1.0);
      final barHeight = amplitude * maxBarHeight;
      final x = i * slotWidth + slotWidth / 2;

      paint
        ..color = i < activeBars ? activeColor : inactiveColor
        ..strokeWidth = strokeWidth;

      canvas.drawLine(
        Offset(x, centerY - barHeight / 2),
        Offset(x, centerY + barHeight / 2),
        paint,
      );
    }
  }

  void _paintRolling(Canvas canvas, Size size) {
    final slotWidth = barWidth + barGap;
    if (slotWidth <= 0) return;

    final capacity = (size.width / slotWidth).floor();
    if (capacity <= 0) return;

    final totalWidth = capacity * slotWidth;
    final startX = size.width - totalWidth;
    final centerY = size.height / 2;
    final maxBarHeight = size.height * maxBarHeightFactor;
    final paint = Paint()..strokeCap = StrokeCap.round;

    final hasOverflow = samples.length > capacity;
    final emptyCount = hasOverflow ? 0 : capacity - samples.length;
    final firstSlot = hasOverflow ? -1 : emptyCount;
    final visibleStart = hasOverflow ? samples.length - capacity - 1 : 0;
    final visibleCount = hasOverflow ? capacity + 1 : samples.length;
    final scrollOffset = slotWidth * (1 - scrollProgress.clamp(0.0, 1.0));

    // Empty dots keep the meter readable before the first samples arrive and
    // while the waveform is still filling the available width.
    paint
      ..color = emptyColor
      ..strokeWidth = barWidth;
    for (var i = 0; i < emptyCount; i++) {
      final x = startX + i * slotWidth + barWidth / 2;
      canvas.drawLine(Offset(x, centerY), Offset(x, centerY), paint);
    }

    for (var i = 0; i < visibleCount; i++) {
      final sampleIndex = visibleStart + i;
      if (sampleIndex < 0 || sampleIndex >= samples.length) continue;

      final amplitude = samples[sampleIndex].clamp(0.0, 1.0);
      final barHeight = amplitude * maxBarHeight;
      final slot = firstSlot + i;
      final x = startX + slot * slotWidth + barWidth / 2 + scrollOffset;

      paint
        ..color = activeColor
        ..strokeWidth = barWidth;

      canvas.drawLine(
        Offset(x, centerY - barHeight / 2),
        Offset(x, centerY + barHeight / 2),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant WaveformPainter oldDelegate) {
    return !listEquals(oldDelegate.samples, samples) ||
        oldDelegate.progress != progress ||
        oldDelegate.activeColor != activeColor ||
        oldDelegate.inactiveColor != inactiveColor ||
        oldDelegate.emptyColor != emptyColor ||
        oldDelegate.fit != fit ||
        oldDelegate.barWidth != barWidth ||
        oldDelegate.barGap != barGap ||
        oldDelegate.maxBarHeightFactor != maxBarHeightFactor ||
        oldDelegate.scrollProgress != scrollProgress;
  }
}
