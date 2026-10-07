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
    this.label,
    this.animationDuration = const Duration(milliseconds: 250),
  }) : assert(options.length > 0, 'options must not be empty');

  final List<SegmentedOption<T>> options;
  final T value;
  final ValueChanged<T> onChanged;

  final bool enabled;

  final double? segmentMinWidth;

  final String? label;
  final Duration animationDuration;

  @override
  State<SegmentedSwitch<T>> createState() => _SegmentedSwitchState<T>();
}

class _SegmentedSwitchState<T> extends State<SegmentedSwitch<T>> {
  static const double _containerPadding = 5.0;
  static const double _containerRadius = 50.0;
  static const double _indicatorRadius = 25.0;
  static const double _borderWidth = 1.0;
  static const double _blurSigma = 18.0;

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
    final count = widget.options.length;
    const insets = (_containerPadding + _borderWidth) * 2;

    return LayoutBuilder(
      builder: (context, constraints) {
        final iconOnly = widget.options.every((o) => o.isIconOnly);
        final minWidth = widget.segmentMinWidth ?? (iconOnly ? 45 : 110);
        final viewport = constraints.hasBoundedWidth
            ? constraints.maxWidth
            : null;
        final itemWidth = viewport == null || !viewport.isFinite
            ? minWidth
            : math.max((viewport - insets) / count, minWidth);
        final activeIndex = _activeIndex;

        return ScrollConfiguration(
          behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(_containerRadius),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: _blurSigma, sigmaY: _blurSigma),
              child: Container(
                width: viewport?.isFinite == true
                    ? viewport
                    : itemWidth * count + insets,
                padding: const EdgeInsets.all(_containerPadding),
                decoration: BoxDecoration(
                  color: scheme.surface.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(_containerRadius),
                  border: Border.all(
                    color: scheme.outline.withValues(alpha: 0.25),
                    width: _borderWidth,
                  ),
                ),
                child: SingleChildScrollView(
                  controller: _scrollController,
                  scrollDirection: Axis.horizontal,
                  child: Stack(
                    children: [
                      AnimatedPositioned(
                        duration: widget.animationDuration,
                        curve: Curves.easeOutCubic,
                        left: activeIndex * itemWidth,
                        top: 0,
                        bottom: 0,
                        width: itemWidth,
                        child: Container(
                          decoration: BoxDecoration(
                            color: scheme.primary,
                            borderRadius: BorderRadius.circular(
                              _indicatorRadius,
                            ),
                          ),
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          for (var i = 0; i < count; i++)
                            _SegmentButton<T>(
                              key: _itemKeys[i],
                              option: widget.options[i],
                              width: itemWidth,
                              isActive: i == activeIndex,
                              enabled: widget.enabled,
                              onTap: () => _onSelect(widget.options[i]),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _SegmentButton<T> extends StatelessWidget {
  const _SegmentButton({
    super.key,
    required this.option,
    required this.width,
    required this.isActive,
    required this.enabled,
    required this.onTap,
  });

  final SegmentedOption<T> option;
  final double width;
  final bool isActive;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final interactive = enabled && option.enabled;
    // Active segment sits on `scheme.primary`, so it needs `onPrimary`
    // for contrast; inactive segments sit on the glass container.
    final foreground = isActive ? scheme.onPrimary : scheme.onSurfaceVariant;
    final hasLabel = option.label?.isNotEmpty == true;

    return Semantics(
      button: true,
      selected: isActive,
      enabled: interactive,
      child: Opacity(
        opacity: interactive ? 1 : 0.5,
        child: InkWell(
          borderRadius: BorderRadius.circular(25),
          onTap: interactive ? onTap : null,
          child: SizedBox(
            width: width,
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
    );
  }
}
