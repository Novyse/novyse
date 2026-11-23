import 'package:material_ui/material_ui.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/huge_icon.dart';

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
