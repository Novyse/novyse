import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:novyse/core/auth/session_cleanup.dart';
import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/router/router.dart';
import 'package:novyse/pages/app/app_license_page.dart';

/// Opens [url] in the system browser (or self tab on web).
Future<bool> _openLegalUrl(String url) async {
  final uri = Uri.parse(url);
  try {
    return await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {
    return false;
  }
}

Future<bool> _openLicenses(BuildContext context) async {
  if (!context.mounted) return false;
  showLicensePage(
    context: context,
    applicationName: config.appName,
    applicationVersion: config.appVersion,
    applicationLegalese: '© 2026 Novyse · GPL-3.0-or-later',
  );
  return true;
}

Future<bool> _openAppLicense(BuildContext context) async {
  if (!context.mounted) return false;
  await Navigator.of(context).push(
    MaterialPageRoute<void>(builder: (_) => const AppLicensePage()),
  );
  return true;
}

/// Executes a catalog action. Returns true when the action was handled
Future<bool> runSettingsAction(
  WidgetRef ref,
  BuildContext context,
  String actionId,
) async {
  switch (actionId) {
    case 'logout':
      await performLogout(ref);
      if (context.mounted) {
        ref.read(routerProvider).go('/welcome');
      }
      return true;
    case 'openPrivacyPolicy':
      return _openLegalUrl(config.privacyPolicyUrl);
    case 'openTerms':
      return _openLegalUrl(config.tosUrl);
    case 'openLicenses':
      return _openLicenses(context);
    case 'openAppLicense':
      return _openAppLicense(context);
    default:
      return false;
  }
}
