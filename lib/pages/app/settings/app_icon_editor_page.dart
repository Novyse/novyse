import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import 'package:novyse/core/appicon/app_icon_catalog.dart';
import 'package:novyse/core/appicon/app_icon_service.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/settings/settings_select_row.dart';

/// Glyph picker: persists the choice and applies the native alias / desktop icon.
class AppIconGlyphList extends ConsumerWidget {
  const AppIconGlyphList({super.key});

  static bool get _isDesktop =>
      currentOS == AppOS.windows ||
      currentOS == AppOS.linux ||
      currentOS == AppOS.macos;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final iconId =
        ref.watch(settingsControllerProvider)[AppIconCatalog.iconKey]
            as String? ??
        AppIconCatalog.defaultIconId;
    final options = AppIconCatalog.pickerGlyphs(desktop: _isDesktop);

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < options.length; i++) ...[
          if (i > 0)
            Divider(
              height: 1,
              thickness: 1,
              color: Theme.of(context).colorScheme.outline,
            ),
          _GlyphOptionRow(
            glyph: options[i],
            previewAsset: AppIconCatalog.previewAsset(
              options[i],
              desktop: _isDesktop,
            ),
            selected: _isSelected(options[i], iconId),
            label: _glyphLabel(l10n, options[i], desktop: _isDesktop),
            subtitle: _glyphSubtitle(l10n, options[i], desktop: _isDesktop),
            onSelect: () => _pick(context, ref, options[i]),
          ),
        ],
      ],
    );
  }

  bool _isSelected(AppIconGlyph glyph, String iconId) {
    if (_isDesktop && !glyph.appliesOnDesktop) {
      return AppIconCatalog.isDesktopBaseSelection(iconId);
    }
    return glyph.id == iconId;
  }

  Future<void> _pick(
    BuildContext context,
    WidgetRef ref,
    AppIconGlyph glyph,
  ) async {
    // Desktop base row always persists as white (dark is folded into it).
    final targetId = (_isDesktop && !glyph.appliesOnDesktop)
        ? AppIconCatalog.defaultIconId
        : glyph.id;
    final current =
        ref.read(settingsControllerProvider)[AppIconCatalog.iconKey]
            as String? ??
        AppIconCatalog.defaultIconId;
    if (_isDesktop && !glyph.appliesOnDesktop) {
      if (AppIconCatalog.isDesktopBaseSelection(current)) return;
    } else if (glyph.id == current) {
      return;
    }

    final l10n = context.l10n;
    try {
      await ref.read(appIconServiceProvider).applyIconId(targetId);
      final ok = await ref
          .read(settingsControllerProvider.notifier)
          .set(AppIconCatalog.iconKey, targetId);
      if (!ok && context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.appIconSaveError)));
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.appIconSaveError)));
      }
    }
  }
}

class _GlyphOptionRow extends StatelessWidget {
  final AppIconGlyph glyph;
  final String previewAsset;
  final bool selected;
  final String label;
  final String? subtitle;
  final VoidCallback onSelect;

  const _GlyphOptionRow({
    required this.glyph,
    required this.previewAsset,
    required this.selected,
    required this.label,
    required this.subtitle,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SettingsSelectRow(
      leading: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        clipBehavior: Clip.antiAlias,
        child: ColoredBox(
          // Desktop cutouts are transparent — give them a plate so the "N"
          // reads in the list.
          color: scheme.surfaceContainerHighest,
          child: Image.asset(
            previewAsset,
            width: 48,
            height: 48,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.medium,
          ),
        ),
      ),
      title: label,
      subtitle: subtitle,
      selected: selected,
      onTap: onSelect,
    );
  }
}

String _glyphLabel(
  AppLocalizations l10n,
  AppIconGlyph glyph, {
  required bool desktop,
}) {
  if (desktop && !glyph.appliesOnDesktop) {
    return l10n.settingsOptionAppIconDesktopDefaultLabel;
  }
  return switch (glyph.id) {
    'dark' => l10n.settingsOptionAppIconDarkLabel,
    'sakura' => l10n.settingsOptionAppIconSakuraLabel,
    _ => l10n.settingsOptionAppIconWhiteLabel,
  };
}

String? _glyphSubtitle(
  AppLocalizations l10n,
  AppIconGlyph glyph, {
  required bool desktop,
}) {
  if (desktop && !glyph.appliesOnDesktop) {
    return l10n.settingsItemAppIconWhiteDefaultNote;
  }
  if (glyph.alias == null) return l10n.settingsItemAppIconWhiteDefaultNote;
  return null;
}
