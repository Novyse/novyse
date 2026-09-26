import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';

import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/oss_licenses.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/settings/settings_external_link_row.dart';
import 'package:novyse/ui/components/settings/settings_navigation_row.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_search_bar.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';

class OssLicensesPage extends StatefulWidget {
  const OssLicensesPage({super.key});

  @override
  State<OssLicensesPage> createState() => _OssLicensesPageState();
}

class _OssLicensesPageState extends State<OssLicensesPage> {
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  bool _searching = false;
  String _query = '';

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
    setState(() => _query = value);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final trimmed = _query.trim().toLowerCase();

    final filteredPackages = trimmed.isEmpty
        ? allDependencies
        : allDependencies.where((p) {
            return p.name.toLowerCase().contains(trimmed) ||
                p.description.toLowerCase().contains(trimmed);
          }).toList();

    return PopScope(
      canPop: !_searching,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_searching) _closeSearch();
      },
      child: SettingsPageTemplate(
        title: l10n.settingsItemOpenSourceTitle,
        actions: [
          if (!_searching)
            FloatingIconButton(
              icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedSearch01),
              tooltip: l10n.searchChats,
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
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
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
          if (filteredPackages.isEmpty)
            Padding(
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text(
                  l10n.searchNoResults,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            )
          else
            SettingsSection(
              children: [
                for (final package in filteredPackages)
                  SettingsNavigationRow(
                    title: package.name,
                    subtitle: package.version != null ? 'v${package.version}' : null,
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => PackageLicenseDetailPage(package: package),
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

class PackageLicenseDetailPage extends StatelessWidget {
  const PackageLicenseDetailPage({super.key, required this.package});

  final Package package;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;

    final hasDescription = package.description.trim().isNotEmpty;
    final hasHomepage = package.homepage != null && package.homepage!.trim().isNotEmpty;
    final hasRepo = package.repository != null &&
        package.repository!.trim().isNotEmpty &&
        package.repository != package.homepage;
    final hasAuthors = package.authors.isNotEmpty;

    final hasInfo = hasDescription || hasHomepage || hasRepo || hasAuthors;

    return SettingsPageTemplate(
      title: package.name,
      subtitle: package.version != null ? 'v${package.version}' : null,
      children: [
        if (hasInfo)
          SettingsSection(
            children: [
              if (hasDescription)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    package.description.trim(),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurface,
                    ),
                  ),
                ),
              if (hasAuthors)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Text(
                    package.authors.join(', '),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              if (hasHomepage)
                SettingsExternalLinkRow(
                  icon: HugeIcons.strokeRoundedGlobe,
                  title: 'Homepage',
                  subtitle: package.homepage,
                  url: package.homepage,
                ),
              if (hasRepo)
                SettingsExternalLinkRow(
                  icon: HugeIcons.strokeRoundedGlobe,
                  title: 'Repository',
                  subtitle: package.repository,
                  url: package.repository,
                ),
            ],
          ),
        SettingsSection(
          title: l10n.settingsItemAppLicenseTitle,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: SelectableText(
                (package.license != null && package.license!.trim().isNotEmpty)
                    ? package.license!.trim()
                    : 'No license text provided.',
                style: const TextStyle(
                  fontSize: 12,
                  height: 1.5,
                  fontFamily: 'monospace',
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
