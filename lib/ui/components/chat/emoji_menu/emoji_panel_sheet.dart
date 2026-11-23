import 'dart:math' as math;

import 'package:material_ui/material_ui.dart';
import 'package:novyse/core/themes/themes.dart';

/// Emoji/GIF sheet sized to the IME slot; drag-down dismisses and reports
/// [onDragOffset] so the parent can lower the composer with it.
class EmojiPanelSheet extends StatefulWidget {
  const EmojiPanelSheet({
    super.key,
    required this.height,
    required this.onDismiss,
    required this.child,
    this.maxDrag,
    this.onDragOffset,
    this.animation,
  });

  final double height;
  final double? maxDrag;
  final ValueChanged<double>? onDragOffset;
  final VoidCallback onDismiss;
  final Widget child;
  final Animation<double>? animation;

  @override
  State<EmojiPanelSheet> createState() => _EmojiPanelSheetState();
}

class _EmojiPanelSheetState extends State<EmojiPanelSheet> {
  double _dragOffset = 0;

  double get _maxDrag => widget.maxDrag ?? widget.height;

  void _setDragOffset(double next) {
    final clamped = next.clamp(0.0, _maxDrag);
    if (clamped == _dragOffset) return;
    _dragOffset = clamped;
    widget.onDragOffset?.call(_dragOffset);
  }

  void _finishDrag({required bool shouldClose}) {
    if (shouldClose) {
      widget.onDismiss();
    } else {
      _setDragOffset(0);
    }
  }

  @override
  void didUpdateWidget(covariant EmojiPanelSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_dragOffset > _maxDrag) _setDragOffset(_maxDrag);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.height < 1) return const SizedBox.shrink();

    final colorScheme = Theme.of(context).colorScheme;
    final handle = GestureDetector(
      behavior: HitTestBehavior.opaque,
      onVerticalDragUpdate: (d) => _setDragOffset(_dragOffset + d.delta.dy),
      onVerticalDragEnd: (d) => _finishDrag(
        shouldClose:
            _dragOffset > _maxDrag * 0.25 || (d.primaryVelocity ?? 0) > 600,
      ),
      onVerticalDragCancel: () =>
          _finishDrag(shouldClose: _dragOffset > _maxDrag * 0.25),
      child: SizedBox(
        height: math.min(28.0, widget.height),
        child: Center(
          child: Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
              borderRadius: BorderRadius.circular(AppRadius.xsm),
            ),
          ),
        ),
      ),
    );

    Widget sheet = Material(
      color: colorScheme.surfaceContainerHighest,
      elevation: 0,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.bg)),
      ),
      clipBehavior: Clip.antiAlias,
      child: widget.height <= 28
          ? handle
          : Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                handle,
                Expanded(child: widget.child),
              ],
            ),
    );

    final animation = widget.animation;
    if (animation != null) {
      sheet = SlideTransition(
        position: Tween<Offset>(begin: const Offset(0, 1), end: Offset.zero)
            .animate(
              CurvedAnimation(
                parent: animation,
                curve: Curves.easeOutCubic,
                reverseCurve: Curves.easeInCubic,
              ),
            ),
        child: sheet,
      );
    }

    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: sheet,
    );
  }
}
