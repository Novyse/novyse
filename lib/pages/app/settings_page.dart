import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';

import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/settings/settings_search.dart';

import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/settings/settings_navigation_row.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_search_bar.dart';
import 'package:novyse/ui/components/settings/settings_search_results.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';

import 'settings_catalog_page.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  bool _searching = false;
  String _query = '';

  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _openSearch() {
    setState(() => _searching = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _searchFocusNode.requestFocus();
    });
  }

  void _closeSearch() {
    _searchController.clear();
    _searchFocusNode.unfocus();
    setState(() {
      _searching = false;
      _query = '';
    });
  }

  void _onQueryChanged(String value) {
    // Local in-memory filtering: no debounce needed.
    setState(() => _query = value);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final trimmed = _query.trim();
    final isFiltering = _searching && trimmed.isNotEmpty;
    final results = isFiltering
        ? searchSettings(context: context, query: trimmed)
        : const <SettingCategory, List<SettingItem>>{};

    return PopScope(
      canPop: !_searching,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_searching) _closeSearch();
      },
      child: SettingsPageTemplate(
        title: l10n.settings,
        showBack: false,
        actions: [
          if (!_searching)
            FloatingIconButton(
              icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedSearch01),
              tooltip: l10n.settingsSearchHint,
              onPressed: _openSearch,
            ),
        ],
        appBarContent: _searching
            ? Row(
                children: [
                  Expanded(
                    child: SettingsSearchBar(
                      controller: _searchController,
                      focusNode: _searchFocusNode,
                      onQueryChanged: _onQueryChanged,
                    ),
                  ),
                  const SizedBox(width: FloatingAppBarConsts.pillSpacing),
                  FloatingPill(
                    padding: FloatingAppBarConsts.iconPillPadding,
                    child: FloatingIconButton(
                      icon: const AppHugeIcon(
                        icon: HugeIcons.strokeRoundedCancel01,
                      ),
                      tooltip: l10n.cancel,
                      onPressed: _closeSearch,
                    ),
                  ),
                ],
              )
            : null,
        children: [
          if (isFiltering)
            SettingsSearchResults(results: results)
          else
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
      ),
    );
  }
}
