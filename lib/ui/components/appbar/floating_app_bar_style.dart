import 'dart:ui';

import 'package:flutter/material.dart';

/// Shared constants for every floating pill app bar.
///
/// Used by chat detail / overview / favorites / list / search / selected
/// headers and by the settings template, so a future style tweak happens
/// once here instead of in N copy-pasted [_pill] helpers.
abstract final class FloatingAppBarConsts {
  /// Horizontal gap between the floating pills in a bar row.
  static const double pillSpacing = 12.0;

  /// Backdrop blur applied to every pill.
  static const double blurSigma = 18.0;

  /// Fill / border opacities for the glassy pill surface.
  static const double surfaceOpacity = 0.6;
  static const double borderOpacity = 0.25;

  /// Fully-rounded icon / action pills vs. the larger central pill.
  static const double pillRadius = 100.0;
  static const double centralRadius = 28.0;

  /// Outer padding of a single-icon pill (back, search, menu, ...).
  static const EdgeInsetsGeometry iconPillPadding = EdgeInsets.all(barInset);

  /// Canonical bar metrics — single source of truth for every icon box,
  /// pill height and glyph in app bars AND sub-header rows. Everything
  /// below aliases these, so a size tweak happens once here.
  ///
  /// - 42 box (buttons, avatar, row content) + 2 + 2 glass = 46,
  ///   plus 2px of border = 48 outer, i.e. the Material 48px touch target.
  static const double barContentSize = 42.0;

  /// Total outer pill height/width (2 + 42 + 2 + 2 border = 48).
  static const double barOuterSize = 48.0;

  /// Icon glyph drawn inside the 42 box (same as the Material default).
  static const double barIconSize = 24.0;

  /// Glass padding around content.
  static const double barInset = 2.0;

  /// Inner-row padding: 42 content + 3 + 3 = 48, so rows are exactly the
  /// app bar height with symmetric insets.
  static const double barInnerInset = 3.0;

  /// Box of every icon button living inside a pill.
  static const double iconButtonSize = barContentSize;
  static const EdgeInsets iconButtonPadding = EdgeInsets.all(8.0);

  /// Forces icon buttons to exactly [iconButtonSize], matching the
  /// 48px Material default outer pill height.
  static ButtonStyle get iconButtonStyle => const ButtonStyle(
    minimumSize: WidgetStatePropertyAll(
      Size(iconButtonSize, iconButtonSize),
    ),
    maximumSize: WidgetStatePropertyAll(
      Size(iconButtonSize, iconButtonSize),
    ),
    padding: WidgetStatePropertyAll(iconButtonPadding),
    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
  );

  /// Total outer width of a single-icon pill.
  /// Used for the balancing spacer in centered-title bars.
  static const double iconPillOuterSize = barOuterSize;

  /// Outer padding of the central pill when it hosts a 42px leading
  /// (avatar / star circle). Total height: 2 + 42 + 2 = 46 + 2 border = 48.
  static const EdgeInsetsGeometry centralAvatarPadding = EdgeInsets.all(
    barInset,
  );

  /// Outer padding of the trailing actions pill (search, toggles, ...).
  static const EdgeInsetsGeometry actionsPadding = EdgeInsets.all(barInset);

  /// Outer padding of the search-field central pill.
  /// Combined with [searchFieldHeight] it yields 2 + 42 + 2 = 46,
  /// plus 2px border = 48 outer, like every other central pill.
  static const EdgeInsetsGeometry searchFieldPadding = EdgeInsets.fromLTRB(
    16,
    2,
    8,
    2,
  );

  /// Minimum content height of search fields. Same box as every icon.
  static const double searchFieldHeight = barContentSize;

  /// Compact constraints for the clear (X) button inside search fields,
  /// so it never inflates the pill when it appears.
  static const BoxConstraints searchClearConstraints = BoxConstraints(
    minWidth: 32,
    minHeight: 32,
  );

  /// Outer padding of a centered-title central pill (settings).
  /// Combined with [centralMinHeight] it yields the same 48px outer height
  /// as the avatar pills in chat bars.
  static const EdgeInsetsGeometry centralTitlePadding = EdgeInsets.fromLTRB(
    8,
    2,
    8,
    2,
  );

  /// Minimum content height inside [centralTitlePadding] so the pill
  /// measures 48px outer like the chat ones.
  static const double centralMinHeight = barContentSize;

  /// Size of the leading (avatar / icon circle) and its gap
  /// to the title column.
  static const double leadingSize = barContentSize;
  static const double leadingGap = 12.0;

  /// Outer skin of the sub-header stacked under every chat app bar
  /// ([ChatSubHeader]): 2px padding + 24px radius, so it reads as the
  /// same glassy card as the navbar pills above it.
  static const double subHeaderRadius = 24.0;
  static const EdgeInsetsGeometry subHeaderPadding = EdgeInsets.all(barInset);

  /// Inner rows (pinned / voice / comms) share the same 24px radius and
  /// fill [barOuterSize], exactly like every app bar pill.
  static const double subHeaderInnerRadius = 24.0;

  /// Gap between stacked inner rows — same as the outer glass padding.
  static const double subHeaderGap = barInset;

  /// Inner padding of every row, fully symmetric.
  static const EdgeInsets subHeaderInnerPadding = EdgeInsets.all(
    barInnerInset,
  );

  /// Icon-to-text gap inside rows (same as [leadingGap]).
  static const double subHeaderContentGap = leadingGap;

  /// Text-to-actions gap inside rows.
  static const double subHeaderActionsGap = 8.0;

  /// Vertical gap between the bar row and an optional [bottom] slot.
  static const double bottomGap = 12.0;

  /// Title / subtitle text styles shared by every central pill.
  static const TextStyle titleStyle = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w700,
  );

  static TextStyle subtitleStyle(
    ColorScheme scheme, {
    bool highlighted = false,
  }) => TextStyle(
    fontSize: 10,
    color: highlighted ? scheme.primary : scheme.onSurfaceVariant,
  );
}

/// Icon button pre-sized for floating app bars: exactly
/// [FloatingAppBarConsts.iconButtonSize] (42, 48 outer with pill).
/// Use this — not a raw [IconButton] — for every button inside a pill.
class FloatingIconButton extends StatelessWidget {
  const FloatingIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.tooltip,
    this.focusNode,
  });

  final Widget icon;
  final VoidCallback? onPressed;
  final String? tooltip;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      style: FloatingAppBarConsts.iconButtonStyle,
      tooltip: tooltip,
      focusNode: focusNode,
      onPressed: onPressed,
      icon: icon,
    );
  }
}

/// Glassy pill container shared by every floating app bar.
///
/// Pure skin (blur + translucent surface + border + padding): it imposes
/// no width/height of its own, so it shrink-wraps and adapts to whatever
/// [child] measures — avatar rows, text fields, centered titles, counters.
class FloatingPill extends StatelessWidget {
  const FloatingPill({
    super.key,
    required this.child,
    this.padding = EdgeInsets.zero,
    this.radius = FloatingAppBarConsts.pillRadius,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: FloatingAppBarConsts.blurSigma,
          sigmaY: FloatingAppBarConsts.blurSigma,
        ),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: scheme.surface.withValues(
              alpha: FloatingAppBarConsts.surfaceOpacity,
            ),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(
              color: scheme.outline.withValues(
                alpha: FloatingAppBarConsts.borderOpacity,
              ),
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}
