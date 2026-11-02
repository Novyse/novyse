import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';

import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/stores/profile_draft_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/utils/platform.dart';

import 'package:novyse/ui/components/floating/floating_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';
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
        .where((i) => i.isVisible && i.supportedOS.contains(currentOS))
        .toList();
    final visiblePages = category.pages
        .where(
          (p) => p.groups.any(
            (g) => g.items.any(
              (i) => i.isVisible && i.supportedOS.contains(currentOS),
            ),
          ),
        )
        .toList();

    return SettingsPageTemplate(
      title: context.settingsText(category.title),
      children: [
        SettingsSection(
          children: [
            for (final page in visiblePages)
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
            for (final item in visibleItems) SettingsItemRenderer(item: item),
          ],
        ),
      ],
    );
  }
}

/// Leaf page generated from the catalog: renders groups and items.
/// The header shows the title only.
///
/// On Account > Edit Profile the app bar tracks the profile draft: while
/// name/surname/biography edits are pending, the back pill becomes a
/// discard (undo) button and a confirm (tick) action appears on the
/// right — replaced by a spinner while the save is in flight.
class SettingsGroupPage extends ConsumerWidget {
  final String categoryId;
  final String pageId;

  const SettingsGroupPage({
    super.key,
    required this.categoryId,
    required this.pageId,
  });

  static bool isProfileEditor(String categoryId, String pageId) =>
      categoryId == 'account' && pageId == 'account_profile';

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
              .where((i) => i.isVisible && i.supportedOS.contains(currentOS))
              .toList(),
        ),
    ].where((e) => e.items.isNotEmpty).toList();

    final editingProfile = isProfileEditor(categoryId, pageId);
    final localUser = ref.watch(localUserProvider);
    final draft = ref.watch(profileDraftProvider);
    final draftDirty =
        editingProfile &&
        ref.read(profileDraftProvider.notifier).isDirty(localUser);

    return SettingsPageTemplate(
      title: context.settingsText(page.title),
      backIcon: draftDirty
          ? AppHugeIcon(
              icon: HugeIcons.strokeRoundedUndo,
              color: Theme.of(context).colorScheme.error,
            )
          : null,
      backTooltip: draftDirty ? context.l10n.cancel : null,
      onBack: draftDirty
          ? () => ref.read(profileDraftProvider.notifier).discard()
          : null,
      actions: draftDirty
          ? [
              if (draft.saving)
                const SizedBox(
                  width: FloatingConsts.iconButtonSize,
                  height: FloatingConsts.iconButtonSize,
                  child: Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                )
              else
                FloatingIconButton(
                  icon: const AppHugeIcon(
                    icon: HugeIcons.strokeRoundedTick02,
                  ),
                  tooltip: context.l10n.settingsCommonSave,
                  onPressed: () async {
                    final l10n = context.l10n;
                    final ok = await ref
                        .read(profileDraftProvider.notifier)
                        .save(ref.read(localUserProvider));
                    if (!ok && context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(l10n.profileSaveError)),
                      );
                    }
                  },
                ),
            ]
          : null,
      children: [
        for (final entry in visibleGroups)
          SettingsSection(
            title: context.settingsText(entry.group.title),
            children: [
              for (final item in entry.items) SettingsItemRenderer(item: item),
            ],
          ),
      ],
    );
  }
}
