import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';

const double _segmentPaddingV = 10.0;
const double _segmentPaddingH = 15.0;
const double _segmentGap = 5.0;
const double _segmentIconSize = 18.0;

class SegmentedOption<T> {
  const SegmentedOption({
    required this.value,
    this.label,
    this.icon,
    this.enabled = true,
  });

  final T value;
  final String? label;
  final Widget? icon;
  final bool enabled;

  bool get isIconOnly => icon != null && (label == null || label!.isEmpty);
}

class SegmentedSwitch<T> extends StatefulWidget {
  const SegmentedSwitch({
    super.key,
    required this.options,
    required this.value,
    required this.onChanged,
    this.enabled = true,
    this.segmentMinWidth,
    this.segmentMinHeight,
    this.scrollDirection = Axis.horizontal,
    this.label,
    this.animationDuration = const Duration(milliseconds: 250),
  }) : assert(options.length > 0, 'options must not be empty');

  final List<SegmentedOption<T>> options;
  final T value;
  final ValueChanged<T> onChanged;

  final bool enabled;

  final double? segmentMinWidth;

  final double? segmentMinHeight;

  /// Asse lungo cui sono disposte le opzioni e avviene lo scroll quando
  /// il contenuto eccede la viewport. Di default [Axis.horizontal].
  final Axis scrollDirection;

  bool get isVertical => scrollDirection == Axis.vertical;

  final String? label;
  final Duration animationDuration;

  @override
  State<SegmentedSwitch<T>> createState() => _SegmentedSwitchState<T>();
}

class _SegmentedSwitchState<T> extends State<SegmentedSwitch<T>> {
  static const double _containerPadding = 5.0;
  static const double _borderWidth = 1.0;
  static const double _blurSigma = 18.0;

  // Raggi diversi per asse: in orizzontale vogliamo la pill piena,
  // in verticale un arrotondamento più sobrio. Stesso numero su
  // entrambi gli assi non può funzionare.
  static const double _containerRadiusHorizontal = 28.0;
  static const double _containerRadiusVertical = 24.0;

  double get _containerRadius {
    return widget.scrollDirection == Axis.vertical
        ? _containerRadiusVertical
        : _containerRadiusHorizontal;
  }

  // Concentrico all'outer: outer - padding - border.
  double get _indicatorRadius =>
      _containerRadius - _containerPadding - _borderWidth;

  late final ScrollController _scrollController;
  var _itemKeys = <GlobalKey>[];

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _syncKeys();
    _scrollToActive(jump: true);
  }

  @override
  void didUpdateWidget(SegmentedSwitch<T> oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.options.length != widget.options.length) _syncKeys();
    if (oldWidget.value != widget.value ||
        oldWidget.options.length != widget.options.length) {
      _scrollToActive();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  int get _activeIndex {
    final index = widget.options.indexWhere(
      (option) => option.value == widget.value,
    );
    return index < 0 ? 0 : index;
  }

  void _syncKeys() {
    _itemKeys = List.generate(widget.options.length, (_) => GlobalKey());
  }

  void _scrollToActive({bool jump = false}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scrollController.hasClients) return;
      if (_activeIndex >= _itemKeys.length) return;
      final context = _itemKeys[_activeIndex].currentContext;
      if (context == null) return;
      Scrollable.ensureVisible(
        context,
        alignment: 0.5,
        duration: jump ? Duration.zero : widget.animationDuration,
        curve: Curves.easeOutCubic,
      );
    });
  }

  void _onSelect(SegmentedOption<T> option) {
    if (!widget.enabled || !option.enabled) return;
    if (option.value == widget.value) return;
    widget.onChanged(option.value);
  }

  @override
  Widget build(BuildContext context) {
    final label = widget.label;
    if (label == null || label.isEmpty) return _buildSwitch(context);

    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: theme.textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        _buildSwitch(context),
      ],
    );
  }

  Widget _buildSwitch(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    const insets = (_containerPadding + _borderWidth) * 2;
    final isVertical = widget.scrollDirection == Axis.vertical;

    return LayoutBuilder(
      builder: (context, constraints) {
        final activeIndex = _activeIndex;

        if (!isVertical) {
          final viewport =
              constraints.hasBoundedWidth && constraints.maxWidth.isFinite
              ? constraints.maxWidth
              : null;
          final widths = _segmentWidths(context, viewport, insets);

          // Stadium clip on the scroll viewport: a partially scrolled-out
          // segment (and the indicator) slides behind a rounded end instead
          // of being cut with a straight edge, so nothing ever turns
          // rectangular while scrolling.
          final scroll = ClipRRect(
            borderRadius: BorderRadius.circular(_indicatorRadius),
            child: _buildScroll(widths, null, activeIndex),
          );

          return ScrollConfiguration(
            behavior: ScrollConfiguration.of(context)
                .copyWith(scrollbars: false),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(_containerRadius),
              child: BackdropFilter(
                filter: ImageFilter.blur(
                  sigmaX: _blurSigma,
                  sigmaY: _blurSigma,
                ),
                child: Container(
                  width:
                      viewport ??
                      widths.fold<double>(0, (a, b) => a + b) + insets,
                  padding: const EdgeInsets.all(_containerPadding),
                  decoration: BoxDecoration(
                    color: scheme.surface.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(_containerRadius),
                    border: Border.all(
                      color: scheme.outline.withValues(alpha: 0.25),
                      width: _borderWidth,
                    ),
                  ),
                  child: scroll,
                ),
              ),
            ),
          );
        }

        // Vertical layout: segments stacked in a Column, scroll on Axis.vertical.
        final mainViewport =
            constraints.hasBoundedHeight && constraints.maxHeight.isFinite
            ? constraints.maxHeight
            : null;
        final crossViewport =
            constraints.hasBoundedWidth && constraints.maxWidth.isFinite
            ? constraints.maxWidth
            : null;
        final heights = _segmentHeights(context, mainViewport, insets);
        final totalMain = heights.fold<double>(0, (a, b) => a + b);
        final maxContentWidth = _maxContentWidth(context);
        final containerWidth = crossViewport ?? maxContentWidth + insets;
        final segmentWidth = math.max(0.0, containerWidth - insets);
        final containerHeight = mainViewport ?? totalMain + insets;

        final scroll = ClipRRect(
          borderRadius: BorderRadius.circular(_indicatorRadius),
          child: _buildScroll(
            null,
            heights,
            activeIndex,
            crossExtent: segmentWidth,
          ),
        );

        return ScrollConfiguration(
          behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(_containerRadius),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: _blurSigma, sigmaY: _blurSigma),
              child: Container(
                width: containerWidth,
                height: containerHeight,
                padding: const EdgeInsets.all(_containerPadding),
                decoration: BoxDecoration(
                  color: scheme.surface.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(_containerRadius),
                  border: Border.all(
                    color: scheme.outline.withValues(alpha: 0.25),
                    width: _borderWidth,
                  ),
                ),
                child: scroll,
              ),
            ),
          ),
        );
      },
    );
  }

  /// Natural (content sized) width of a single segment: icon + gap + label
  /// text plus the horizontal padding the button applies.
  double _measureContentWidth(BuildContext context, SegmentedOption<T> option) {
    var width = 0.0;
    final hasLabel = option.label?.isNotEmpty == true;

    if (option.icon != null) {
      width += _segmentIconSize;
      if (hasLabel) width += _segmentGap;
    }
    if (hasLabel) {
      width += _measureTextWidth(context, option.label!);
      width += _segmentPaddingH * 2;
    }

    return width.ceilToDouble();
  }

  double _measureTextWidth(BuildContext context, String text) {
    final theme = Theme.of(context);
    final style =
        theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600) ??
        const TextStyle(fontWeight: FontWeight.w600);
    final painter = TextPainter(
      text: TextSpan(text: text, style: style),
      maxLines: 1,
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();
    final width = painter.width;
    painter.dispose();
    return width;
  }

  double _measureTextHeight(BuildContext context, String text) {
    final theme = Theme.of(context);
    final style =
        theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600) ??
        const TextStyle(fontWeight: FontWeight.w600);
    final painter = TextPainter(
      text: TextSpan(text: text, style: style),
      maxLines: 1,
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout();
    final height = painter.height;
    painter.dispose();
    return height;
  }

  /// Natural height of a single segment: tallest between icon and label
  /// plus the vertical padding the button applies.
  double _measureContentHeight(
    BuildContext context,
    SegmentedOption<T> option,
  ) {
    var content = 0.0;
    if (option.icon != null) content = math.max(content, _segmentIconSize);
    final hasLabel = option.label?.isNotEmpty == true;
    if (hasLabel) {
      content = math.max(content, _measureTextHeight(context, option.label!));
    }
    return (content + _segmentPaddingV * 2).ceilToDouble();
  }

  double _maxContentWidth(BuildContext context) {
    var maxWidth = 0.0;
    for (final option in widget.options) {
      maxWidth = math.max(maxWidth, _measureContentWidth(context, option));
    }
    final iconOnly = widget.options.every((o) => o.isIconOnly);
    final minWidth = widget.segmentMinWidth ?? (iconOnly ? 45 : 0);
    return math.max(maxWidth, minWidth);
  }

  /// Per segment widths derived from content, never narrower than
  /// [SegmentedSwitch.segmentMinWidth]. When the natural widths leave room in
  /// the available viewport the leftover space is shared evenly so the control
  /// still fills its slot without ever shrinking (and therefore ellipsing) a
  /// label.
  List<double> _segmentWidths(
    BuildContext context,
    double? viewport,
    double insets,
  ) {
    final options = widget.options;
    if (options.isEmpty) return const [];
    final iconOnly = options.every((o) => o.isIconOnly);
    final minWidth = widget.segmentMinWidth ?? (iconOnly ? 45 : 0);
    final widths = <double>[
      for (final option in options)
        math.max(_measureContentWidth(context, option), minWidth),
    ];

    if (viewport == null) return widths;
    final available = math.max(0.0, viewport - insets);
    var total = 0.0;
    for (final width in widths) {
      total += width;
    }
    if (total >= available) return widths;

    final extra = (available - total) / widths.length;
    return [for (final width in widths) width + extra];
  }

  /// Per segment heights for the vertical layout, derived from content and
  /// never shorter than [SegmentedSwitch.segmentMinHeight]. When the natural
  /// heights leave room in the available viewport the leftover space is shared
  /// evenly so the control still fills its slot.
  List<double> _segmentHeights(
    BuildContext context,
    double? viewport,
    double insets,
  ) {
    final options = widget.options;
    if (options.isEmpty) return const [];
    final iconOnly = options.every((o) => o.isIconOnly);
    final minHeight = widget.segmentMinHeight ?? (iconOnly ? 45 : 0);
    final heights = <double>[
      for (final option in options)
        math.max(_measureContentHeight(context, option), minHeight),
    ];

    if (viewport == null) return heights;
    final available = math.max(0.0, viewport - insets);
    var total = 0.0;
    for (final height in heights) {
      total += height;
    }
    if (total >= available) return heights;

    final extra = (available - total) / heights.length;
    return [for (final height in heights) height + extra];
  }

  Widget _buildScroll(
    List<double>? widths,
    List<double>? heights,
    int activeIndex, {
    double? crossExtent,
  }) {
    final isVertical = widget.scrollDirection == Axis.vertical;
    if (isVertical) {
      return _buildVerticalScroll(
        heights ?? const [],
        activeIndex,
        crossExtent: crossExtent,
      );
    }
    return _buildHorizontalScroll(widths ?? const [], activeIndex);
  }

  Widget _buildHorizontalScroll(List<double> widths, int activeIndex) {
    final scheme = Theme.of(context).colorScheme;
    var indicatorLeft = 0.0;
    for (var i = 0; i < activeIndex && i < widths.length; i++) {
      indicatorLeft += widths[i];
    }
    final indicatorWidth = widths.isEmpty
        ? 0.0
        : widths[math.min(activeIndex, widths.length - 1)];

    return SingleChildScrollView(
      controller: _scrollController,
      scrollDirection: Axis.horizontal,
      child: Stack(
        children: [
          AnimatedPositioned(
            duration: widget.animationDuration,
            curve: Curves.easeOutCubic,
            left: indicatorLeft,
            top: 0,
            bottom: 0,
            width: indicatorWidth,
            child: Container(
              decoration: BoxDecoration(
                color: scheme.primary,
                borderRadius: BorderRadius.circular(_indicatorRadius),
              ),
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < widget.options.length; i++)
                _SegmentButton<T>(
                  key: _itemKeys[i],
                  option: widget.options[i],
                  width: widths[i],
                  indicatorRadius: _indicatorRadius,
                  isActive: i == activeIndex,
                  enabled: widget.enabled,
                  onTap: () => _onSelect(widget.options[i]),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVerticalScroll(
    List<double> heights,
    int activeIndex, {
    double? crossExtent,
  }) {
    final scheme = Theme.of(context).colorScheme;
    var indicatorTop = 0.0;
    for (var i = 0; i < activeIndex && i < heights.length; i++) {
      indicatorTop += heights[i];
    }
    final indicatorHeight = heights.isEmpty
        ? 0.0
        : heights[math.min(activeIndex, heights.length - 1)];

    return SingleChildScrollView(
      controller: _scrollController,
      scrollDirection: Axis.vertical,
      child: Stack(
        children: [
          AnimatedPositioned(
            duration: widget.animationDuration,
            curve: Curves.easeOutCubic,
            top: indicatorTop,
            left: 0,
            right: 0,
            height: indicatorHeight,
            child: Container(
              decoration: BoxDecoration(
                color: scheme.primary,
                borderRadius: BorderRadius.circular(_indicatorRadius),
              ),
            ),
          ),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var i = 0; i < widget.options.length; i++)
                _SegmentButton<T>(
                  key: _itemKeys[i],
                  option: widget.options[i],
                  width: crossExtent,
                  height: i < heights.length ? heights[i] : null,
                  indicatorRadius: _indicatorRadius,
                  isActive: i == activeIndex,
                  enabled: widget.enabled,
                  onTap: () => _onSelect(widget.options[i]),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SegmentButton<T> extends StatelessWidget {
  const _SegmentButton({
    super.key,
    required this.option,
    this.width,
    this.height,
    required this.indicatorRadius,
    required this.isActive,
    required this.enabled,
    required this.onTap,
  });

  final SegmentedOption<T> option;
  final double? width;
  final double? height;
  final double indicatorRadius;
  final bool isActive;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final interactive = enabled && option.enabled;
    final foreground = isActive ? scheme.onPrimary : scheme.onSurfaceVariant;
    final hasLabel = option.label?.isNotEmpty == true;

    return Semantics(
      button: true,
      selected: isActive,
      enabled: interactive,
      child: Opacity(
        opacity: interactive ? 1 : 0.5,
        child: Material(
          type: MaterialType.transparency,
          borderRadius: BorderRadius.circular(indicatorRadius),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            borderRadius: BorderRadius.circular(indicatorRadius),
            hoverColor: foreground.withValues(alpha: 0.08),
            splashColor: foreground.withValues(alpha: 0.12),
            highlightColor: foreground.withValues(alpha: 0.08),
            focusColor: foreground.withValues(alpha: 0.08),
            mouseCursor: interactive
                ? SystemMouseCursors.click
                : SystemMouseCursors.basic,
            onTap: interactive ? onTap : null,
            child: SizedBox(
              width: width,
              height: height,
              child: Padding(
                padding: EdgeInsets.symmetric(
                  vertical: _segmentPaddingV,
                  horizontal: hasLabel ? _segmentPaddingH : 0,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (option.icon != null) ...[
                      IconTheme(
                        data: IconThemeData(
                          color: foreground,
                          size: _segmentIconSize,
                        ),
                        child: DefaultTextStyle(
                          style: TextStyle(color: foreground),
                          child: option.icon!,
                        ),
                      ),
                      if (hasLabel) const SizedBox(width: _segmentGap),
                    ],
                    if (hasLabel)
                      Flexible(
                        child: Text(
                          option.label!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style:
                              theme.textTheme.labelLarge?.copyWith(
                                fontWeight: FontWeight.w600,
                                color: foreground,
                              ) ??
                              TextStyle(
                                fontWeight: FontWeight.w600,
                                color: foreground,
                              ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
