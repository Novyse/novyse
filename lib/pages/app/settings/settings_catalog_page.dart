import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/utils/platform.dart';

import 'package:novyse/ui/components/settings/settings_item_renderer.dart';
import 'package:novyse/ui/components/settings/settings_navigation_row.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';

/// Category page generated from the catalog.
class SettingsCategoryPage extends ConsumerWidget {
  final String categoryId;

  const SettingsCategoryPage({super.key, required this.categoryId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final category = SettingsCatalog.findCategory(categoryId);
    if (category == null) {
      return const SettingsPageTemplate(title: '', children: []);
    }
    final visibleItems = category.items
        .where((i) => i.supportedOS.contains(currentOS))
        .toList();

    return SettingsPageTemplate(
      title: context.settingsText(category.title),
      children: [
        SettingsSection(
          children: [
            for (final page in category.pages)
              SettingsNavigationRow(
                icon: category.icon,
                title: context.settingsText(page.title),
                subtitle: context.settingsText(page.subtitle),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => SettingsGroupPage(
                      categoryId: categoryId,
                      pageId: page.id,
                    ),
                  ),
                ),
              ),
            for (final item in visibleItems)
              SettingsItemRenderer(item: item),
          ],
        ),
      ],
    );
  }
}

/// Leaf page generated from the catalog: renders groups and items.
/// The header shows the title only.
class SettingsGroupPage extends ConsumerWidget {
  final String categoryId;
  final String pageId;

  const SettingsGroupPage({
    super.key,
    required this.categoryId,
    required this.pageId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final page = SettingsCatalog.findPage(categoryId, pageId);
    if (page == null) {
      return const SettingsPageTemplate(title: '', children: []);
    }
    final visibleGroups = [
      for (final group in page.groups)
        (
          group: group,
          items: group.items
              .where((i) => i.supportedOS.contains(currentOS))
              .toList(),
        ),
    ].where((e) => e.items.isNotEmpty).toList();

    return SettingsPageTemplate(
      title: context.settingsText(page.title),
      children: [
        for (final entry in visibleGroups)
          SettingsSection(
            title: context.settingsText(entry.group.title),
            children: [
              for (final item in entry.items)
                SettingsItemRenderer(item: item),
            ],
          ),
      ],
    );
  }
}
