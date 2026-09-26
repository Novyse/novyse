import 'package:flutter/material.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/pages/app/settings/settings_catalog_page.dart';
import 'package:novyse/ui/components/settings/settings_item_renderer.dart';
import 'package:novyse/ui/components/settings/settings_navigation_row.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';

/// Search results grouped by settings category.
///
/// Each group is a [SettingsSection] whose first row navigates to the
/// category page; every matched item is rendered with
/// [SettingsItemRenderer], so rows stay fully functional (switches toggle,
/// selects open their sheets, ...) exactly like on their category page.
class SettingsSearchResults extends StatelessWidget {
  const SettingsSearchResults({
    super.key,
    required this.results,
  });

  final Map<SettingCategory, List<SettingItem>> results;

  @override
  Widget build(BuildContext context) {
    if (results.isEmpty) {
      final colorScheme = Theme.of(context).colorScheme;
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
        child: Text(
          AppLocalizations.of(context)!.settingsSearchNoResults,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurfaceVariant,
              ),
        ),
      );
    }

    final sections = <Widget>[];
    var first = true;
    for (final entry in results.entries) {
      if (!first) sections.add(const SizedBox(height: 20));
      first = false;
      final category = entry.key;
      sections.add(
        SettingsSection(
          children: [
            SettingsNavigationRow(
              icon: category.icon,
              title: context.settingsText(category.title),
              subtitle: context.settingsText(category.subtitle),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) =>
                      SettingsCategoryPage(categoryId: category.id),
                ),
              ),
            ),
            for (final item in entry.value)
              SettingsItemRenderer(item: item),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: sections,
    );
  }
}
