import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/appicon/app_icon_catalog.dart';
import 'package:novyse/core/appicon/app_icon_service.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/stores/status_message_type.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/settings/settings_select_row.dart';
import 'package:novyse/ui/components/status/status_message.dart';

/// Fixed warning: the artwork is an Android-only preview.
class AppIconNotice extends StatelessWidget {
  const AppIconNotice({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Padding(
      padding: const EdgeInsets.fromLTRB(15, 12, 15, 12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          StatusMessage(
            type: StatusMessageType.warning,
            content: [l10n.appIconAndroidOnlyPreview],
            closable: false,
          ),
          if (currentOS != AppOS.android && currentOS != AppOS.ios) ...[
            const SizedBox(height: 12),
            StatusMessage(
              type: StatusMessageType.info,
              content: [l10n.appIconUnsupportedMessage],
              closable: false,
            ),
          ],
        ],
      ),
    );
  }
}

/// Glyph picker: persists the choice and applies the native alias.
class AppIconGlyphList extends ConsumerWidget {
  const AppIconGlyphList({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final iconId =
        ref.watch(settingsControllerProvider)[AppIconCatalog.iconKey]
            as String? ??
        AppIconCatalog.defaultIconId;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < AppIconCatalog.glyphs.length; i++) ...[
          if (i > 0)
            Divider(
              height: 1,
              thickness: 1,
              color: Theme.of(context).colorScheme.outline,
            ),
          _GlyphOptionRow(
            glyph: AppIconCatalog.glyphs[i],
            selected: AppIconCatalog.glyphs[i].id == iconId,
            label: _glyphLabel(l10n, AppIconCatalog.glyphs[i].id),
            subtitle: AppIconCatalog.glyphs[i].alias == null
                ? l10n.settingsItemAppIconWhiteDefaultNote
                : null,
            onSelect: () => _pick(context, ref, AppIconCatalog.glyphs[i]),
          ),
        ],
      ],
    );
  }

  Future<void> _pick(
    BuildContext context,
    WidgetRef ref,
    AppIconGlyph glyph,
  ) async {
    final current =
        ref.read(settingsControllerProvider)[AppIconCatalog.iconKey]
            as String? ??
        AppIconCatalog.defaultIconId;
    if (glyph.id == current) return;

    final l10n = context.l10n;
    try {
      await ref
          .read(appIconServiceProvider)
          .applyAlias(AppIconCatalog.resolveAlias(iconId: glyph.id));
      final ok = await ref
          .read(settingsControllerProvider.notifier)
          .set(AppIconCatalog.iconKey, glyph.id);
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
  final bool selected;
  final String label;
  final String? subtitle;
  final VoidCallback onSelect;

  const _GlyphOptionRow({
    required this.glyph,
    required this.selected,
    required this.label,
    required this.subtitle,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return SettingsSelectRow(
      leading: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        clipBehavior: Clip.antiAlias,
        child: Image.asset(
          glyph.asset,
          width: 48,
          height: 48,
          fit: BoxFit.cover,
          filterQuality: FilterQuality.medium,
        ),
      ),
      title: label,
      subtitle: subtitle,
      selected: selected,
      onTap: onSelect,
    );
  }
}

String _glyphLabel(AppLocalizations l10n, String iconId) => switch (iconId) {
  'dark' => l10n.settingsOptionAppIconDarkLabel,
  'sakura' => l10n.settingsOptionAppIconSakuraLabel,
  _ => l10n.settingsOptionAppIconWhiteLabel,
};
