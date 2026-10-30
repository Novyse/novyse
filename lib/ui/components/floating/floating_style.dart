import 'dart:ui';

import 'package:flutter/material.dart';

/// Shared constants for every floating pill in the app.
///
/// Covers app bars, the chat bottom bar, the chat sub-header rows and the
/// master tab bar, so a future style tweak happens once here instead of in
/// N copy-pasted helpers.
abstract final class FloatingConsts {
  /// Horizontal gap between the floating pills in a bar row.
  static const double pillSpacing = 12.0;

  /// Backdrop blur applied to every pill.
  static const double blurSigma = 18.0;

  /// Fill opacity for the glassy pill surface (pills are borderless;
  /// [borderOpacity] is kept for a future restyle).
  static const double surfaceOpacity = 0.05;
  // static const double borderOpacity = 0.25;

  /// Fully-rounded icon / action pills vs. the larger central pill.
  static const double pillRadius = 50.0;
  static const double centralRadius = 24.0;

  /// Outer padding of every pill (single-icon, central, actions,
  /// sub-header). Zero: pills hug their 42 content, the 48 outer comes
  /// from the [FloatingPill] min box with the content kept centered.
  static const EdgeInsetsGeometry iconPillPadding = EdgeInsets.all(barInset);

  /// Canonical bar metrics — single source of truth for every icon box,
  /// pill height and glyph in app bars AND sub-header rows. Everything
  /// below aliases these, so a size tweak happens once here.
  ///
  /// - 44 box (buttons, avatar, row content) + 2 + 2 glass = 48,
  ///   centered in 48 outer by [FloatingPill],
  ///   i.e. the Material 48px touch target.
  static const double barContentSize = 44.0;

  /// Total outer pill height/width (44 content + 4 glass = 48 —
  /// pills are borderless).
  static const double barOuterSize = 48.0;

  /// Icon glyph drawn inside the 44 box (same as the Material default).
  static const double barIconSize = 24.0;

  /// Glass padding around content.
  static const double barInset = 2.0;

  /// Inner padding of every sub-header row: exactly what's left of the
  /// 48 row once the [barContentSize] boxes are centered, so 44 boxes
  /// never overflow. Follows content size automatically.
  static const EdgeInsets subHeaderInnerPadding = EdgeInsets.all(
    (barOuterSize - barContentSize) / 2,
  );

  /// Box of every icon button living inside a pill.
  /// Always fills the pill content exactly ([barOuterSize] minus the glass
  /// on both sides), so the button — and its hover/ink — never overflows
  /// the pill and never leaves a dead ring: with inset 3 the box is 42
  /// like the original design, with inset 0 it stretches to the full 48.
  /// The 24 glyph stays centered in it.
  static const double iconButtonSize = barOuterSize - barInset * 2;
  static const EdgeInsets iconButtonPadding = EdgeInsets.all(8.0);

  /// Forces icon buttons to exactly [iconButtonSize], so the pill
  /// content + glass measures exactly [barOuterSize].
  static ButtonStyle get iconButtonStyle => const ButtonStyle(
    minimumSize: WidgetStatePropertyAll(Size(iconButtonSize, iconButtonSize)),
    maximumSize: WidgetStatePropertyAll(Size(iconButtonSize, iconButtonSize)),
    padding: WidgetStatePropertyAll(iconButtonPadding),
    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
  );

  /// Total outer width of a single-icon pill.
  /// Used for the balancing spacer in centered-title bars.
  static const double iconPillOuterSize = barOuterSize;

  /// Outer padding of the search-field central pill.
  /// Horizontal insets position the text; vertical is zero like every
  /// other pill (48 outer comes from [FloatingPill]).
  static const EdgeInsetsGeometry searchFieldPadding = EdgeInsets.fromLTRB(
    16,
    barInset,
    8,
    barInset,
  );

  /// Minimum content height of search fields. Same box as every icon:
  /// 44 + vertical glass = 48 outer, with the text centered by its own
  /// Align.
  static const double searchFieldHeight = barContentSize;

  /// Compact constraints for the clear (X) button inside search fields,
  /// so it never inflates the pill when it appears.
  static const BoxConstraints searchClearConstraints = BoxConstraints(
    minWidth: 32,
    minHeight: 32,
  );

  /// Outer padding of a centered-title central pill (settings).
  /// Horizontal insets only; vertical is zero, 48 outer comes from
  /// [FloatingPill] like every other pill.
  static const EdgeInsetsGeometry centralTitlePadding = EdgeInsets.fromLTRB(
    8,
    barInset,
    8,
    barInset,
  );

  /// Minimum content height inside [centralTitlePadding]. Same box as
  /// every icon: 44 + vertical glass = 48 outer. Every central content
  /// self-centers (Column center, Center, Align, Rows).
  static const double centralMinHeight = barContentSize;

  /// Size of the leading (avatar / icon circle) and its gap
  /// to the title column.
  static const double leadingSize = barContentSize;
  static const double leadingGap = 12.0;

  /// Outer skin of the sub-header stacked under every chat app bar ([ChatSubHeader])
  static const double subHeaderRadius = 50.0;

  /// Outer padding of the sub-header card. Equals [barInset] so the card
  /// carries the same glass frame as every other pill; inner rows are
  /// already exactly [barOuterSize] tall, so the card measures 48 + glass.
  static const EdgeInsetsGeometry subHeaderOuterPadding = EdgeInsets.all(
    barInset,
  );

  /// Inner rows (pinned / voice / comms) share the same 24px radius and
  /// fill [barOuterSize], exactly like every app bar pill.
  static const double subHeaderInnerRadius = 24.0;

  /// Gap between stacked inner rows. Equals [barInset], same glass
  /// rhythm as the card frame.
  static const double subHeaderGap = barInset;

  /// Icon-to-text gap inside rows (same as [leadingGap]).
  static const double subHeaderContentGap = leadingGap;

  /// Text-to-actions gap inside rows.
  static const double subHeaderActionsGap = 8.0;

  /// Vertical gap between the bar row and an optional [bottom] slot.
  static const double bottomGap = 12.0;

  // ---------------------------------------------------------------------------
  // Floating tab bar (master). Values mirror the tab bar as built — do not
  // retune them here; they are centralized only so every floating element
  // reads from this file. Literals are kept independent from the app-bar
  // ones on purpose, so tweaking an app bar never moves the tab bar.
  // ---------------------------------------------------------------------------

  /// Outer height of the floating tab bar.
  static const double tabBarHeight = 68.0;

  /// Corner radius of the bar, the sliding indicator and the tab inks.
  static const double tabBarRadius = 100.0;

  /// Bar width = pane width * this, clamped between [tabBarMinWidth] and
  /// [tabBarMaxWidth].
  static const double tabBarWidthFactor = 0.64;
  static const double tabBarMinWidth = 220.0;
  static const double tabBarMaxWidth = 420.0;

  /// Inner padding of the bar.
  static const EdgeInsets tabBarPadding = EdgeInsets.symmetric(
    horizontal: 8,
    vertical: 8,
  );

  /// Backdrop blur of the bar glass.
  static const double tabBarBlurSigma = 18.0;

  /// Fill / border opacities of the bar glass.
  static const double tabBarSurfaceOpacity = 0.05;
  static const double tabBarBorderOpacity = 0.25;

  /// Drop shadow under the bar.
  static const double tabBarShadowOpacity = 0.08;
  static const double tabBarShadowBlur = 100.0;
  static const Offset tabBarShadowOffset = Offset(0, 10);

  /// Fill opacity of the sliding selection indicator.
  static const double tabIndicatorOpacity = 0.14;

  /// Glyph size of the tab icons.
  static const double tabIconSize = 28.0;

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

/// Icon button pre-sized for floating pills: exactly
/// [FloatingConsts.iconButtonSize] (fills the pill content edge to edge).
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
      style: FloatingConsts.iconButtonStyle,
      tooltip: tooltip,
      focusNode: focusNode,
      onPressed: onPressed,
      icon: icon,
    );
  }
}

/// Glassy pill container shared by every floating element.
///
/// Pure skin (blur + translucent surface + padding) with a minimum
/// [barOuterSize] x [barOuterSize] outer box. It shrink-wraps [child]
/// (tight constraints flow down untouched, exactly like the original
/// borderless pill), so full-width contents keep centering themselves
/// and narrow ones hug — the minimum only kicks in for short content.
/// Short contents are responsible for centering themselves (all of them
/// do: search/central align, rows self-center, buttons fill).
///
/// Pass [enforceMinSize] = false to opt out and shrink-wrap [child]
/// with no minimum at all (used by overlay chips like the voice user
/// card, which keep their own compact paddings and sizes).
class FloatingPill extends StatelessWidget {
  const FloatingPill({
    super.key,
    required this.child,
    this.padding = EdgeInsets.zero,
    this.radius = FloatingConsts.pillRadius,
    this.enforceMinSize = true,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final bool enforceMinSize;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: FloatingConsts.blurSigma,
          sigmaY: FloatingConsts.blurSigma,
        ),
        child: Container(
          padding: padding,
          constraints: enforceMinSize
              ? const BoxConstraints(
                  minWidth: FloatingConsts.barOuterSize,
                  minHeight: FloatingConsts.barOuterSize,
                )
              : null,
          decoration: BoxDecoration(
            color: scheme.primary.withValues(
              alpha: FloatingConsts.surfaceOpacity,
            ),
            borderRadius: BorderRadius.circular(radius),
          ),
          child: child,
        ),
      ),
    );
  }
}
