import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import 'package:novyse/core/auth/session_cleanup.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/router/router.dart';
import 'package:novyse/core/services/auth.dart' as auth_service;
import 'package:novyse/core/updater/manual_update_check.dart';
import 'package:novyse/pages/app/settings/app_license_page.dart';
import 'package:novyse/pages/app/settings/legal_document_page.dart';
import 'package:novyse/pages/app/settings/oss_licenses_page.dart';

Future<bool> _openLegalDocument(
  BuildContext context,
  LegalDocument document,
  String title,
) async {
  if (!context.mounted) return false;
  await Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => LegalDocumentPage(document: document, title: title),
    ),
  );
  return true;
}

Future<bool> _openLicenses(BuildContext context) async {
  if (!context.mounted) return false;
  await Navigator.of(context)
      .push(MaterialPageRoute<void>(builder: (_) => const OssLicensesPage()));
  return true;
}

Future<bool> _openAppLicense(BuildContext context) async {
  if (!context.mounted) return false;
  await Navigator.of(context)
      .push(MaterialPageRoute<void>(builder: (_) => const AppLicensePage()));
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
    case 'deleteProfile':
      final result = await auth_service.auth.account.delete();
      if (!result.success) {
        debugPrint('[settings-action] deleteProfile failed: ${result.error}');
        return false;
      }
      await performLogout(ref);
      if (context.mounted) {
        ref.read(routerProvider).go('/welcome');
      }
      return true;
    case 'openLicenses':
      return _openLicenses(context);
    case 'openAppLicense':
      return _openAppLicense(context);
    case 'openPrivacyPolicy':
      return _openLegalDocument(
        context,
        LegalDocument.privacy,
        AppLocalizations.of(context)!.settingsItemPrivacyPolicyTitle,
      );
    case 'openTermsOfService':
      return _openLegalDocument(
        context,
        LegalDocument.terms,
        AppLocalizations.of(context)!.settingsItemTermsTitle,
      );
    case 'checkUpdates':
      return handleManualUpdateCheck(ref, context);
    default:
      return false;
  }
}
