import 'package:flutter/material.dart';

/// Vertical pane-resize handle in 
/// master/detail divider, forum sub-list divider
/// 
class PaneResizer extends StatefulWidget {
  const PaneResizer({super.key, required this.onDrag});

  /// Horizontal drag delta in logical pixels (positive = grow left pane).
  final ValueChanged<double> onDrag;

  /// Width of the in-flow strip separating the panes.
  static const double stripWidth = 12;

  /// Height of the interactive pill hit area (centered vertically).
  static const double hitHeight = 72;

  /// Height of the visible pill.
  static const double pillHeight = 36;

  /// Width of the visible pill.
  static const double pillWidth = 3;

  @override
  State<PaneResizer> createState() => _PaneResizerState();
}

class _PaneResizerState extends State<PaneResizer> {
  bool _hovered = false;
  bool _dragging = false;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final active = _hovered || _dragging;
    final pillColor = active
        ? scheme.primary.withValues(alpha: 0.55)
        : scheme.outlineVariant.withValues(alpha: 0.65);

    return SizedBox(
      width: PaneResizer.stripWidth,
      height: double.infinity,
      child: Center(
        child: MouseRegion(
          cursor: SystemMouseCursors.resizeColumn,
          onEnter: (_) => setState(() => _hovered = true),
          onExit: (_) => setState(() => _hovered = false),
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onHorizontalDragStart: (_) => setState(() => _dragging = true),
            onHorizontalDragUpdate: (details) =>
                widget.onDrag(details.delta.dx),
            onHorizontalDragEnd: (_) => setState(() => _dragging = false),
            onHorizontalDragCancel: () => setState(() => _dragging = false),
            child: SizedBox(
              width: PaneResizer.stripWidth,
              height: PaneResizer.hitHeight,
              child: Center(
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 120),
                  width: PaneResizer.pillWidth,
                  height: PaneResizer.pillHeight,
                  decoration: BoxDecoration(
                    color: pillColor,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
