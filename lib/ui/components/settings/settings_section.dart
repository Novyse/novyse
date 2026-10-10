import 'package:flutter/material.dart';

/// Grouped settings section (adapts `production` `SettingsSection.tsx`).
///
/// Renders an optional [title] label plus a single card containing
/// [children]. Dividers between rows are inserted automatically, so callers
/// never have to handle last-row border logic.
class SettingsSection extends StatelessWidget {
  const SettingsSection({super.key, this.title, required this.children});

  final String? title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final sectionTitle = title;

    final separated = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      separated.add(children[i]);
      if (i < children.length - 1) {
        separated.add(
          Divider(height: 1, thickness: 1, color: colorScheme.outline),
        );
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (sectionTitle != null && sectionTitle.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8, left: 4, right: 4),
            child: Text(
              sectionTitle,
              style: theme.textTheme.titleSmall?.copyWith(
                color: colorScheme.primary,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        Card(
          margin: EdgeInsets.zero,
          clipBehavior: Clip.antiAlias,
          // Explicit theme colors: surfaceContainerHighest is surfaceAlt
          // (#EAF4FF) in light mode and #12283B in dark mode. Transparent
          // surfaceTint so Material 3 doesn't shift the color.
          color: colorScheme.surfaceContainerHighest,
          surfaceTintColor: Colors.transparent,
          shadowColor: Colors.transparent,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: separated,
          ),
        ),
      ],
    );
  }
}
