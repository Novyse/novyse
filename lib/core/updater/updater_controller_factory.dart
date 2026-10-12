library;

import 'dart:io';

import 'package:desktop_updater/desktop_updater.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../config/global.dart' as config;
import '../utils/platform.dart';
import 'update_recovery_store.dart';
import 'updater_keys.dart';

const String _updateChannel = 'stable';

/// Stores the pending install marker under the app's support directory.
Future<JsonFileUpdateRecoveryStore> createUpdateRecoveryStore() async {
  final dir = await getApplicationSupportDirectory();
  return JsonFileUpdateRecoveryStore(
    File(
      '${dir.path}${Platform.pathSeparator}desktop_updater'
      '${Platform.pathSeparator}pending-install-$_updateChannel.json',
    ),
  );
}

Future<DesktopUpdaterController> createDesktopUpdaterController({
  DesktopUpdateLocalization? localization,
  Uri? appArchiveUrl,
}) async {
  if (trustedReleasePublicKeys.isEmpty) {
    throw StateError('No production update public keys are configured.');
  }
  final recoveryStore = await createUpdateRecoveryStore();
  final overrideEnv = Platform.environment['NOVYSE_UPDATE_ARCHIVE_URL'];
  final resolvedUrl = appArchiveUrl ??
      (overrideEnv != null && overrideEnv.isNotEmpty
          ? Uri.parse(overrideEnv)
          : productionAppArchiveUrl);

  return DesktopUpdaterController(
    appArchiveUrl: resolvedUrl,
    expectedPackageId: config.appId,
    trustedReleasePublicKeys: trustedReleasePublicKeys,
    recoveryStore: recoveryStore,
    channel: _updateChannel,
    localization: localization,
    skipInitialVersionCheck: true,
  );
}

Future<void> recoverPendingDesktopInstall() async {
  if (kIsWeb) return;
  if (currentPlatform != AppPlatform.desktop ||
      currentInstallSource != AppInstallSource.direct) {
    return;
  }
  try {
    final controller = await createDesktopUpdaterController();
    await controller.recoverPendingInstall();
    controller.dispose();
  } catch (e) {
    debugPrint('[updater] pending-install recovery skipped: $e');
  }
}
