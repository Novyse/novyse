import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/settings/settings_base_row.dart';

/// Opens [url] in the system browser (or self tab on web).
Future<bool> openExternalUrl(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return false;
  try {
    return await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {
    return false;
  }
}

/// Row that opens an external link (browser / outside the app).
///
/// Same layout as [SettingsNavigationRow], but the trailing icon is the
/// classic "box with up-right arrow"
/// ([HugeIcons.strokeRoundedSquareArrowOutUpRight])
/// instead of the plain right arrow, so users can tell they are leaving
/// the app.
///
/// Pass [url] to open it directly (no action needed); [onTap] takes
/// precedence when provided (e.g. in tests). The trailing icon is shown
/// only when the row is tappable ([onTap] or non-empty [url]).
class SettingsExternalLinkRow extends StatelessWidget {
  const SettingsExternalLinkRow({
    super.key,
    this.icon,
    this.leading,
    required this.title,
    this.subtitle,
    this.danger = false,
    this.url,
    this.onTap,
    this.trailingIcon = HugeIcons.strokeRoundedSquareArrowOutUpRight,
  });

  final List<List<dynamic>>? icon;
  final Widget? leading;
  final String title;
  final String? subtitle;
  final bool danger;

  /// URL opened directly in the system browser. No action needed.
  final String? url;
  final VoidCallback? onTap;
  final List<List<dynamic>> trailingIcon;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final link = url;
    final tap =
        onTap ??
        (link != null && link.isNotEmpty ? () => openExternalUrl(link) : null);
    return SettingsBaseRow(
      icon: icon,
      leading: leading,
      title: title,
      subtitle: subtitle,
      danger: danger,
      onTap: tap,
      trailing: tap == null
          ? null
          : AppHugeIcon(
              icon: trailingIcon,
              size: 20,
              color: colorScheme.onSurfaceVariant,
            ),
    );
  }
}
