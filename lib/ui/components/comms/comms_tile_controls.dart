import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Width of the vertical controls rail of an activity tile.
///
/// The rail sits beside the plugin content, so it adds length to the tile and
/// never height: an activity keeps the height the grid gave it.
const double kCommsActivityRailWidth = 44.0;

/// Touch box of the small overlay buttons (pin, fullscreen, ...).
const double kCommsChipButtonSize = 32.0;

/// The controls every tile shares: pin and fullscreen, plus the actions the
/// caller adds for its own kind of tile.
///
/// [vertical] arranges them in a column for the activity rail and in a row for
/// the overlay chip of a participant or screen-share card.
class CommsTileControls extends StatelessWidget {
  const CommsTileControls({
    super.key,
    this.vertical = false,
    required this.isPinned,
    required this.isFullScreen,
    required this.onPin,
    required this.onFullScreen,
    this.showPin = true,
    this.leading = const [],
    this.trailing = const [],
    this.gap = 0,
  });

  /// Column instead of row.
  final bool vertical;

  final bool isPinned;
  final bool isFullScreen;
  final VoidCallback onPin;
  final VoidCallback onFullScreen;

  /// Pin is hidden in fullscreen: there is no grid left to pin into.
  final bool showPin;

  /// Actions placed before pin and fullscreen.
  final List<Widget> leading;

  /// Actions placed after pin and fullscreen.
  final List<Widget> trailing;

  /// Space between two buttons, on the main axis.
  final double gap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    final buttons = <Widget>[
      ...leading,
      if (showPin && !isFullScreen)
        CommsChipIconButton(
          icon: isPinned
              ? HugeIcons.strokeRoundedPinOff
              : HugeIcons.strokeRoundedPin,
          color: isPinned ? colorScheme.primary : colorScheme.onSurfaceVariant,
          tooltip: isPinned ? l10n.commsUnpin : l10n.commsPin,
          onPressed: onPin,
        ),
      CommsChipIconButton(
        icon: isFullScreen
            ? HugeIcons.strokeRoundedArrowShrink01
            : HugeIcons.strokeRoundedArrowExpand01,
        tooltip: isFullScreen ? l10n.commsExitFullScreen : l10n.commsFullScreen,
        onPressed: onFullScreen,
      ),
      ...trailing,
    ];

    final children = <Widget>[];
    for (var index = 0; index < buttons.length; index++) {
      if (index > 0 && gap > 0) {
        children.add(vertical ? SizedBox(height: gap) : SizedBox(width: gap));
      }
      children.add(buttons[index]);
    }

    return Flex(
      direction: vertical ? Axis.vertical : Axis.horizontal,
      mainAxisSize: MainAxisSize.min,
      children: children,
    );
  }
}

/// Vertical controls of an activity tile, attached to the right of the 16:9
/// plugin surface.
///
/// Same actions as the overlay of a participant card, arranged in a column,
/// plus the close button and the overflow button that opens the complete
/// context menu. It is always visible, fullscreen included, and the
/// [FittedBox] keeps it usable when a busy room shrinks the tile.
class CommsActivityControlRail extends StatelessWidget {
  const CommsActivityControlRail({
    super.key,
    required this.isPinned,
    required this.isFullScreen,
    required this.readOnly,
    required this.onClose,
    required this.onPin,
    required this.onFullScreen,
    required this.onMore,
  });

  final bool isPinned;
  final bool isFullScreen;
  final bool readOnly;
  final VoidCallback onClose;
  final VoidCallback onPin;
  final VoidCallback onFullScreen;
  final void Function(Offset anchor) onMore;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final status = context.statusColors;

    return Container(
      width: kCommsActivityRailWidth,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
        border: Border(
          left: BorderSide(color: colorScheme.outline.withValues(alpha: 0.25)),
        ),
      ),
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Center(
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: CommsTileControls(
            vertical: true,
            gap: 2,
            isPinned: isPinned,
            isFullScreen: isFullScreen,
            onPin: onPin,
            onFullScreen: onFullScreen,
            leading: [
              if (!readOnly)
                CommsChipIconButton(
                  icon: HugeIcons.strokeRoundedCancel01,
                  color: status.danger,
                  tooltip: l10n.activitiesClose,
                  onPressed: onClose,
                ),
            ],
            trailing: [
              Builder(
                builder: (buttonContext) => CommsChipIconButton(
                  icon: HugeIcons.strokeRoundedMoreVertical,
                  tooltip: l10n.commsMoreOptions,
                  onPressed: () {
                    final box = buttonContext.findRenderObject() as RenderBox?;
                    final anchor = box == null
                        ? Offset.zero
                        : box.localToGlobal(Offset(0, box.size.height + 4));
                    onMore(anchor);
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Small round button for the tile controls. 32px box, 18px icon — same
/// proportions as the 42/20 app-bar buttons, one step smaller.
class CommsChipIconButton extends StatelessWidget {
  const CommsChipIconButton({
    super.key,
    required this.icon,
    this.color,
    required this.tooltip,
    required this.onPressed,
  });

  final dynamic icon;
  final Color? color;
  final String tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: SizedBox(
            width: kCommsChipButtonSize,
            height: kCommsChipButtonSize,
            child: Center(
              child: AppHugeIcon(
                icon: icon,
                color: color ?? Theme.of(context).colorScheme.onSurfaceVariant,
                size: 18,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
