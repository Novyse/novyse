import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Wraps a chat message to provide a tactile swipe-to-reply gesture.
///
/// Swiping either left or right beyond the threshold triggers [onReply] with haptic
/// feedback and smooth spring recovery.
class SwipeToReply extends StatefulWidget {
  const SwipeToReply({
    super.key,
    required this.child,
    required this.onReply,
    this.enabled = true,
    this.isSender = false,
  });

  final Widget child;
  final VoidCallback onReply;
  final bool enabled;
  final bool isSender;

  @override
  State<SwipeToReply> createState() => _SwipeToReplyState();
}

class _SwipeToReplyState extends State<SwipeToReply>
    with SingleTickerProviderStateMixin {
  static const double _maxDragOffset = 76.0;
  static const double _triggerThreshold = 42.0;

  late final AnimationController _controller;
  Animation<double>? _animation;

  double _dragOffset = 0.0;
  bool _hasTriggered = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    )..addListener(() {
      if (_animation != null) {
        setState(() {
          _dragOffset = _animation!.value;
          if (_dragOffset == 0.0) {
            _hasTriggered = false;
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleDragStart(DragStartDetails details) {
    if (!widget.enabled) return;
    _controller.stop();
    _dragOffset = 0.0;
    _hasTriggered = false;
  }

  void _handleDragUpdate(DragUpdateDetails details) {
    if (!widget.enabled) return;
    final delta = details.primaryDelta ?? 0.0;
    final newOffset = _dragOffset + delta;

    final sign = newOffset == 0 ? 0.0 : (newOffset > 0 ? 1.0 : -1.0);
    final rawMagnitude = newOffset.abs();
    final clampedMagnitude = rawMagnitude <= _maxDragOffset
        ? rawMagnitude
        : _maxDragOffset + (rawMagnitude - _maxDragOffset) * 0.2;

    _dragOffset = sign * clampedMagnitude;

    if (_dragOffset.abs() >= _triggerThreshold) {
      if (!_hasTriggered) {
        _hasTriggered = true;
        HapticFeedback.lightImpact();
      }
    } else {
      _hasTriggered = false;
    }

    setState(() {});
  }

  void _handleDragEnd(DragEndDetails details) {
    if (!widget.enabled) return;
    if (_hasTriggered) {
      widget.onReply();
    }
    _animateBack();
  }

  void _handleDragCancel() {
    if (!widget.enabled) return;
    _animateBack();
  }

  void _animateBack() {
    _animation = Tween<double>(
      begin: _dragOffset,
      end: 0.0,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOutCubic,
      ),
    );
    _controller.forward(from: 0.0);
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled) {
      return widget.child;
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isSwiping = _dragOffset != 0.0;
    final isSwipingRight = _dragOffset > 0;
    final progress = (_dragOffset.abs() / _triggerThreshold).clamp(0.0, 1.0);

    return RawGestureDetector(
      gestures: {
        HorizontalDragGestureRecognizer:
            GestureRecognizerFactoryWithHandlers<HorizontalDragGestureRecognizer>(
          () => HorizontalDragGestureRecognizer(
            supportedDevices: {
              PointerDeviceKind.touch,
              PointerDeviceKind.stylus,
              PointerDeviceKind.trackpad,
            },
          ),
          (instance) {
            instance
              ..onStart = _handleDragStart
              ..onUpdate = _handleDragUpdate
              ..onEnd = _handleDragEnd
              ..onCancel = _handleDragCancel;
          },
        ),
      },
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          if (isSwiping)
            Positioned.fill(
              child: Align(
                alignment: isSwipingRight
                    ? Alignment.centerLeft
                    : Alignment.centerRight,
                child: Padding(
                  padding: EdgeInsets.only(
                    left: isSwipingRight ? 12 : 0,
                    right: isSwipingRight ? 0 : 12,
                  ),
                  child: Opacity(
                    opacity: progress,
                    child: Transform.scale(
                      scale: _hasTriggered ? 1.12 : (0.4 + 0.6 * progress),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _hasTriggered
                              ? colorScheme.primary
                              : colorScheme.surfaceContainerHighest,
                          boxShadow: [
                            BoxShadow(
                              color: colorScheme.shadow.withValues(alpha: 0.12),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Transform.flip(
                            flipX: isSwipingRight,
                            child: AppHugeIcon(
                              icon: HugeIcons.strokeRoundedArrowMoveUpLeft,
                              size: 18,
                              color: _hasTriggered
                                  ? colorScheme.onPrimary
                                  : colorScheme.primary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          Transform.translate(
            offset: Offset(_dragOffset, 0),
            child: widget.child,
          ),
        ],
      ),
    );
  }
}
