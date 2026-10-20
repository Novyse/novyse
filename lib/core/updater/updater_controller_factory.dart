library;

import 'dart:io';

import 'package:desktop_updater/desktop_updater.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import '../config/global.dart' as config;
import '../utils/platform.dart';
import 'self_update_capability.dart';
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
    diagnosticsRecorder: UpdateDiagnosticsRecorder(channel: _updateChannel),
  );
}

/// Clears a wedged pending-install marker left behind by a failed attempt.
Future<void> clearStalePendingDesktopInstall() async {
  try {
    final recoveryStore = await createUpdateRecoveryStore();
    final marker = await recoveryStore.readPendingInstall(
      channel: _updateChannel,
    );
    if (marker == null) return;
    if (marker.updateVersion == config.appVersion) return;
    final stagingPath = marker.stagingPath;
    if (stagingPath != null && stagingPath.isNotEmpty) {
      try {
        final stageDir = Directory(stagingPath);
        if (await stageDir.exists()) {
          await stageDir.delete(recursive: true);
        }
      } catch (e) {
        debugPrint('[updater] stale stage cleanup skipped: $e');
      }
    }
    await recoveryStore.clearPendingInstall(channel: _updateChannel);
    debugPrint(
      '[updater] cleared stale pending install for ${marker.updateVersion}.',
    );
  } catch (e) {
    debugPrint('[updater] stale pending-install cleanup skipped: $e');
  }
}

Future<void> recoverPendingDesktopInstall() async {
  if (kIsWeb) return;
  if (currentPlatform != AppPlatform.desktop ||
      currentInstallSource != AppInstallSource.direct ||
      !canSelfUpdateInstallation()) {
    return;
  }
  try {
    final controller = await createDesktopUpdaterController();
    await controller.recoverPendingInstall();
    controller.dispose();
  } catch (e) {
    debugPrint('[updater] pending-install recovery skipped: $e');
  }
  await clearStalePendingDesktopInstall();
}
