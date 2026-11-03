import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart' as intl;

import 'package:novyse/core/utils/platform.dart';

/// Which wheels [DatetimePicker] shows.
enum DatetimePickerMode {
  /// Only day / month / year wheels.
  date,

  /// Only hour / minute wheels.
  time,

  /// Date wheels next to time wheels.
  dateTime,
}

/// Wheel-style date/time picker.
///
/// - [mode] decides whether the user picks a date, a time, or both
///   (side by side).
/// - [initialDateTime] defaults to "now" (today + current time).
/// - [yearsBack]/[yearsForward] bound the year wheel around the current
///   year (defaults 50 / 50).
/// - Every wheel always settles on exactly one item (snap point), so a value
///   is always selected — even when released mid-scroll with finger, mouse
///   wheel or cursor drag.
/// - On mobile, every snapped step emits a light [HapticFeedback].
class DatetimePicker extends StatefulWidget {
  const DatetimePicker({
    super.key,
    this.mode = DatetimePickerMode.dateTime,
    this.initialDateTime,
    this.yearsBack = 50,
    this.yearsForward = 50,
    this.onChanged,
    this.itemExtent = 48,
    this.visibleItems = 5,
  });

  final DatetimePickerMode mode;
  final DateTime? initialDateTime;
  final int yearsBack;
  final int yearsForward;
  final ValueChanged<DateTime>? onChanged;

  /// Height of a single wheel row.
  final double itemExtent;

  /// How many rows are visible per wheel (must be odd for a centered band).
  final int visibleItems;

  @override
  State<DatetimePicker> createState() => _DatetimePickerState();
}

class _DatetimePickerState extends State<DatetimePicker> {
  late int _day;
  late int _month;
  late int _year;
  late int _hour;
  late int _minute;

  late FixedExtentScrollController _dayController;
  late FixedExtentScrollController _monthController;
  late FixedExtentScrollController _yearController;
  late FixedExtentScrollController _hourController;
  late FixedExtentScrollController _minuteController;

  late List<int> _years;

  int get _daysInMonth => DateTime(_year, _month + 1, 0).day;

  DateTime get selectedDateTime =>
      DateTime(_year, _month, _day, _hour, _minute);

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    final initial = widget.initialDateTime ?? now;

    final currentYear = now.year;
    _years = List<int>.generate(
      widget.yearsBack + widget.yearsForward + 1,
      (i) => currentYear - widget.yearsBack + i,
    );

    // Clamp the year into the allowed window.
    _year = initial.year.clamp(_years.first, _years.last);
    _month = initial.month.clamp(1, 12);
    _day = initial.day.clamp(1, DateTime(_year, _month + 1, 0).day);
    _hour = initial.hour.clamp(0, 23);
    _minute = initial.minute.clamp(0, 59);

    _dayController = FixedExtentScrollController(initialItem: _day - 1);
    _monthController = FixedExtentScrollController(initialItem: _month - 1);
    _yearController = FixedExtentScrollController(
      initialItem: _years.indexOf(_year),
    );
    _hourController = FixedExtentScrollController(initialItem: _hour);
    _minuteController = FixedExtentScrollController(initialItem: _minute);
  }

  @override
  void dispose() {
    _dayController.dispose();
    _monthController.dispose();
    _yearController.dispose();
    _hourController.dispose();
    _minuteController.dispose();
    super.dispose();
  }

  void _emit() => widget.onChanged?.call(selectedDateTime);

  void _lightHaptic() {
    // Light tick on mobile only — desktop scrolling stays silent.
    if (currentPlatform == AppPlatform.mobile && !kIsWeb) {
      unawaited(HapticFeedback.selectionClick());
    } else if (kIsWeb) {
      // On mobile web the platform check reports web; still give the tick
      // when the OS is touch-based. Best-effort, never throws.
      try {
        unawaited(HapticFeedback.selectionClick());
      } catch (_) {}
    }
  }

  void _onMonthOrYearChanged() {
    // Keep the day valid when month/year change (e.g. 31 -> Feb => 28).
    final maxDay = _daysInMonth;
    if (_day > maxDay) {
      setState(() => _day = maxDay);
      // The day wheel shrinks: jump (no animation) so the snapped item
      // always matches the selected day.
      if (_dayController.hasClients) {
        _dayController.jumpToItem(_day - 1);
      }
    }
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    final showDate = widget.mode != DatetimePickerMode.time;
    final showTime = widget.mode != DatetimePickerMode.date;

    final locale = Localizations.localeOf(context).toString();
    // On narrow screens long month names would overflow: truncate them
    // to max 3 initials (e.g. "Gen", "Feb", "Dic").
    final narrow = MediaQuery.sizeOf(context).width < 600;
    final monthNames = List<String>.generate(12, (i) {
      final full = _capitalized(
        intl.DateFormat.MMMM(locale).format(DateTime(2000, i + 1)),
      );
      if (!narrow) return full;
      return full.substring(0, math.min(3, full.length));
    });

    _WheelColumn<int> dayWheel() => _WheelColumn<int>(
      values: List<int>.generate(_daysInMonth, (i) => i + 1),
      controller: _dayController,
      itemExtent: widget.itemExtent,
      width: 54,
      textFor: (v) => v.toString().padLeft(2, '0'),
      onSelected: (v) {
        _lightHaptic();
        setState(() => _day = v);
        _emit();
      },
    );

    _WheelColumn<int> monthWheel() => _WheelColumn<int>(
      values: List<int>.generate(12, (i) => i + 1),
      controller: _monthController,
      itemExtent: widget.itemExtent,
      width: narrow ? 60 : 112,
      textFor: (v) => monthNames[v - 1],
      onSelected: (v) {
        _lightHaptic();
        setState(() => _month = v);
        _onMonthOrYearChanged();
      },
    );

    _WheelColumn<int> yearWheel() => _WheelColumn<int>(
      values: _years,
      controller: _yearController,
      itemExtent: widget.itemExtent,
      width: 72,
      textFor: (v) => v.toString(),
      selectedIndex: _years.indexOf(_year),
      onSelected: (v) {
        _lightHaptic();
        setState(() => _year = v);
        _onMonthOrYearChanged();
      },
    );

    _WheelColumn<int> hourWheel() => _WheelColumn<int>(
      values: List<int>.generate(24, (i) => i),
      controller: _hourController,
      itemExtent: widget.itemExtent,
      width: 54,
      textFor: (v) => v.toString().padLeft(2, '0'),
      onSelected: (v) {
        _lightHaptic();
        setState(() => _hour = v);
        _emit();
      },
    );

    _WheelColumn<int> minuteWheel() => _WheelColumn<int>(
      values: List<int>.generate(60, (i) => i),
      controller: _minuteController,
      itemExtent: widget.itemExtent,
      width: 54,
      textFor: (v) => v.toString().padLeft(2, '0'),
      onSelected: (v) {
        _lightHaptic();
        setState(() => _minute = v);
        _emit();
      },
    );

    if (showDate && showTime) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _WheelGroup(
            itemExtent: widget.itemExtent,
            visibleItems: widget.visibleItems,
            spacing: 2,
            columns: [dayWheel(), monthWheel(), yearWheel()],
          ),
          _groupDivider(context),
          _WheelGroup(
            itemExtent: widget.itemExtent,
            visibleItems: widget.visibleItems,
            separator: ':',
            columns: [hourWheel(), minuteWheel()],
          ),
        ],
      );
    }

    if (showDate) {
      return _WheelGroup(
        itemExtent: widget.itemExtent,
        visibleItems: widget.visibleItems,
        spacing: 2,
        columns: [dayWheel(), monthWheel(), yearWheel()],
      );
    }

    return _WheelGroup(
      itemExtent: widget.itemExtent,
      visibleItems: widget.visibleItems,
      separator: ':',
      columns: [hourWheel(), minuteWheel()],
    );
  }

  Widget _groupDivider(BuildContext context) {
    return Container(
      width: 1,
      height: widget.itemExtent * widget.visibleItems,
      margin: const EdgeInsets.symmetric(horizontal: 8),
      color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.6),
    );
  }
}

String _capitalized(String s) =>
    s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

/// A row of wheels with a shared centered selection band.
///
/// The selection band is always exactly centered on the wheel area.
class _WheelGroup extends StatelessWidget {
  static const double separatorWidth = 6;

  const _WheelGroup({
    required this.columns,
    required this.itemExtent,
    required this.visibleItems,
    this.spacing = 4,
    this.separator,
  });

  final List<_WheelColumn> columns;
  final double itemExtent;
  final int visibleItems;

  /// Gap between wheels (used when [separator] is null).
  final double spacing;

  /// Text drawn centered between wheels (e.g. ':' between hour/minute).
  /// Takes [separatorWidth] of horizontal space in the wheel row so 
  /// columns stay aligned.
  final String? separator;

  @override
  Widget build(BuildContext context) {
    final height = itemExtent * visibleItems;
    final theme = Theme.of(context);
    final sep = separator;
    // Exact content width so the selection band hugs the wheels.
    double contentWidth = 0;
    for (var i = 0; i < columns.length; i++) {
      if (i > 0) contentWidth += sep != null ? separatorWidth : spacing;
      contentWidth += columns[i].width;
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: height,
          child: Stack(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (var i = 0; i < columns.length; i++) ...[
                    if (i > 0)
                      if (sep != null)
                        SizedBox(
                          width: separatorWidth,
                          child: Center(
                            child: Text(
                              sep,
                              style: theme.textTheme.titleMedium?.copyWith(
                                color: theme.colorScheme.onSurface,
                              ),
                            ),
                          ),
                        )
                      else
                        SizedBox(width: spacing),
                    SizedBox(width: columns[i].width, child: columns[i]),
                  ],
                ],
              ),
              // Selection band: makes the snapped value unmistakable.
              Positioned(
                left: 0,
                right: 0,
                top: (height - itemExtent) / 2,
                height: itemExtent,
                child: IgnorePointer(
                  child: Center(
                    child: Container(
                      width: contentWidth,
                      height: itemExtent,
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary.withValues(alpha: 0.10),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: theme.colorScheme.primary.withValues(alpha: 0.45),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Single fixed-width wheel.
///
/// - On mobile the wheel uses the native [FixedExtentScrollPhysics] so
///   finger flings feel natural and always snap.
/// - On desktop/web the wheel is driven manually: each mouse-wheel notch
///   moves exactly one item (no more skipped values) and cursor drag
///   scrolls the wheel directly. Both always settle on a snap point.
class _WheelColumn<T> extends StatefulWidget {
  const _WheelColumn({
    required this.values,
    required this.controller,
    required this.itemExtent,
    required this.textFor,
    required this.onSelected,
    required this.width,
    this.selectedIndex,
  });

  final List<T> values;
  final FixedExtentScrollController controller;
  final double itemExtent;
  final String Function(T value) textFor;
  final ValueChanged<T> onSelected;

  /// Fixed width of the wheel. Wheels never stretch: this is what keeps
  /// the gaps between them exactly [spacing]-wide.
  final double width;

  /// Index of the currently selected value inside [values]. Defaults to
  /// `controller.initialItem`.
  final int? selectedIndex;

  @override
  State<_WheelColumn<T>> createState() => _WheelColumnState<T>();
}

class _WheelColumnState<T> extends State<_WheelColumn<T>> {
  late int _selected;

  /// Whether this wheel is driven manually (desktop/web) instead of the
  /// native scrollable (mobile).
  bool get _manual =>
      currentPlatform != AppPlatform.mobile || kIsWeb;

  /// Target item for manual stepping (kept in sync with [_selected]).
  late int _pending;

  /// Pixel offset where the current cursor drag started.
  double _dragStartOffset = 0;

  @override
  void initState() {
    super.initState();
    _selected = widget.selectedIndex ?? widget.controller.initialItem;
    _pending = _selected;
  }

  @override
  void didUpdateWidget(covariant _WheelColumn<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    // The day wheel shrinks/grows with month/year: keep the snapped index
    // inside the new range.
    if (widget.values.length != oldWidget.values.length) {
      _selected = _selected.clamp(0, widget.values.length - 1).toInt();
      _pending = _pending.clamp(0, widget.values.length - 1).toInt();
    }
    if (widget.selectedIndex != null &&
        widget.selectedIndex != oldWidget.selectedIndex) {
      _selected = widget.selectedIndex!.clamp(0, widget.values.length - 1).toInt();
      _pending = _selected;
    }
  }

  int get _maxIndex => widget.values.length - 1;

  void _stepTo(int index) {
    final target = index.clamp(0, math.max(_maxIndex, 0)).toInt();
    if (!widget.controller.hasClients) return;
    _pending = target;
    unawaited(
      widget.controller.animateToItem(
        target,
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOut,
      ),
    );
  }

  void _onPointerSignal(PointerSignalEvent event) {
    if (event is PointerScrollEvent) {
      final dy = event.scrollDelta.dy;
      if (dy == 0) return;
      // Exactly one step per wheel event, whatever the delta magnitude:
      // a single notch must never skip values.
      _stepTo(_pending + dy.sign.toInt());
    }
  }

  void _onDragStart(DragStartDetails details) {
    _dragStartOffset = widget.controller.hasClients
        ? widget.controller.offset
        : _selected * widget.itemExtent;
  }

  void _onDragUpdate(DragUpdateDetails details) {
    if (!widget.controller.hasClients) return;
    final maxOffset = math.max(_maxIndex, 0) * widget.itemExtent;
    // The content follows the cursor: dragging down moves the wheel down
    // (towards earlier values), like every other scrollable.
    _dragStartOffset = (_dragStartOffset - details.delta.dy).clamp(
      0,
      maxOffset,
    );
    widget.controller.jumpTo(_dragStartOffset);
  }

  void _onDragEnd(DragEndDetails details) {
    // Snap to the nearest item on release — always a selected value.
    if (!widget.controller.hasClients) return;
    final nearest = (widget.controller.offset / widget.itemExtent).round()
        .clamp(0, math.max(_maxIndex, 0)).toInt();
    _stepTo(nearest);
  }

  /// 0..1 proximity of [index] to the current center: 1 exactly centered,
  /// fading to 0 one row away. Drives the continuous highlight so there is
  /// no visible "jump" when an item enters the selection band.
  double _proximity(int index) {
    if (widget.controller.hasClients) {
      final offset = widget.controller.offset;
      final distance = ((index * widget.itemExtent - offset) /
              widget.itemExtent)
          .abs();
      return (1 - distance).clamp(0.0, 1.0);
    }
    return index == _selected ? 1.0 : 0.0;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final wheel = NotificationListener<ScrollNotification>(
      // Rebuild on every scroll pixel so [_proximity] animates smoothly.
      // depth == 0 keeps only this wheel's own notifications.
      onNotification: (n) {
        if (n.depth == 0 && mounted) setState(() {});
        return false;
      },
      child: ListWheelScrollView.useDelegate(
        controller: widget.controller,
        itemExtent: widget.itemExtent,
        // Mobile: native fling + snap. Desktop/web: manual stepping below,
        // so the native scrollable must not fight it.
        physics: _manual
            ? const NeverScrollableScrollPhysics()
            : const FixedExtentScrollPhysics(),
        // Mouse drag + touch drag both work on desktop; on mobile the
        // native scrollable already handles every pointer.
        dragStartBehavior: DragStartBehavior.down,
        diameterRatio: 1.6,
        perspective: 0.003,
        squeeze: 1.0,
        // No discrete magnifier/opacity steps: the builder below blends
        // color and scale continuously with the scroll position.
        useMagnifier: false,
        onSelectedItemChanged: (index) {
          if (index < 0 || index >= widget.values.length) return;
          setState(() {
            _selected = index;
            _pending = index;
          });
          widget.onSelected(widget.values[index]);
        },
        childDelegate: ListWheelChildBuilderDelegate(
          childCount: widget.values.length,
          builder: (context, index) {
            final t = _proximity(index);
            final color = Color.lerp(
              theme.colorScheme.onSurfaceVariant,
              theme.colorScheme.onSurface,
              t,
            );
            return Center(
              child: Transform.scale(
                scale: 1.0 + 0.12 * t,
                child: Text(
                  widget.textFor(widget.values[index]),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodyMedium?.copyWith(color: color),
                ),
              ),
            );
          },
        ),
      ),
    );

    if (!_manual) return wheel;

    // Desktop/web: one mouse-wheel notch = exactly one item, and the
    // wheel can also be scrolled by dragging with the cursor.
    return Listener(
      onPointerSignal: _onPointerSignal,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onVerticalDragStart: _onDragStart,
        onVerticalDragUpdate: _onDragUpdate,
        onVerticalDragEnd: _onDragEnd,
        child: wheel,
      ),
    );
  }
}
