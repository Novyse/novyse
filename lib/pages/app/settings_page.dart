import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';

import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';

import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/settings/settings_navigation_row.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';

import 'settings_catalog_page.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return SettingsPageTemplate(
      title: l10n.settings,
      showBack: false,
      actions: [
        FloatingIconButton(
          icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedSearch01),
          tooltip: l10n.searchHint,
          // Search UI only for now: no filtering/navigation yet.
          onPressed: () {},
        ),
      ],
      children: [
        SettingsSection(
          children: [
            for (final category in SettingsCatalog.categories)
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
          ],
        ),
      ],
    );
  }
}
