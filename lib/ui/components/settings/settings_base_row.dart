import 'package:flutter/material.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Shared layout for every settings row (adapts the `production`
/// `SettingsRow.tsx` to Flutter, split per row type).
///
/// Renders an optional leading icon (35x35, radius 10, tinted background
/// like `production`), a title + optional subtitle column, and a [trailing]
/// slot owned by each concrete row (arrow, switch, value text, radio...).
class SettingsBaseRow extends StatelessWidget {
  const SettingsBaseRow({
    super.key,
    this.icon,
    this.leading,
    required this.title,
    this.subtitle,
    this.danger = false,
    this.onTap,
    this.trailing,
  });

  /// HugeIcon definition (e.g. `HugeIcons.strokeRoundedSmile`).
  /// Ignored when [leading] is provided.
  final List<List<dynamic>>? icon;

  /// Custom leading widget, replaces the default icon container.
  /// Mirrors `production` `leftElement`.
  final Widget? leading;

  final String title;
  final String? subtitle;

  /// Uses [ColorScheme.error] for icon and title instead of primary/onSurface.
  final bool danger;

  final VoidCallback? onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final rowColor = danger ? colorScheme.error : colorScheme.primary;
    final rowIcon = icon;

    final Widget? leadingWidget =
        leading ??
        (rowIcon != null
            ? Container(
                width: 35,
                height: 35,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  color: rowColor.withValues(alpha: 0.08),
                ),
                alignment: Alignment.center,
                child: AppHugeIcon(icon: rowIcon, size: 20, color: rowColor),
              )
            : null);

    final subtitleText = subtitle;

    final content = Padding(
      padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 15),
      child: Row(
        children: [
          if (leadingWidget != null) ...[
            leadingWidget,
            const SizedBox(width: 15),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 15,
                    color: danger ? colorScheme.error : colorScheme.onSurface,
                  ),
                ),
                if (subtitleText != null && subtitleText.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    subtitleText,
                    style: TextStyle(
                      fontSize: 13,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[const SizedBox(width: 12), trailing!],
        ],
      ),
    );

    final tap = onTap;
    if (tap == null) return content;
    // Transparent material so the ink splash works even when the row is
    // used outside of a Card/SettingsSection.
    return Material(
      type: MaterialType.transparency,
      child: InkWell(onTap: tap, child: content),
    );
  }
}
