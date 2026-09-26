import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/auth/session_cleanup.dart';
import 'package:novyse/core/router/router.dart';
import 'package:novyse/pages/app/settings/app_license_page.dart';
import 'package:novyse/pages/app/settings/oss_licenses_page.dart';

Future<bool> _openLicenses(BuildContext context) async {
  if (!context.mounted) return false;
  await Navigator.of(context).push(
    MaterialPageRoute<void>(builder: (_) => const OssLicensesPage()),
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
    case 'openLicenses':
      return _openLicenses(context);
    case 'openAppLicense':
      return _openAppLicense(context);
    default:
      return false;
  }
}
