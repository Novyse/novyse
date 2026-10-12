import 'package:flutter/foundation.dart';

abstract class DesktopUpdaterController extends ChangeNotifier {
  dynamic get state;
  Future<dynamic> checkForUpdates();
  Future<void> downloadUpdate();
  Future<void> restartApp();
}

class ManualUpdateCheckUpToDate {}
class ManualUpdateCheckFreshInstallRequired {}
class ManualUpdateCheckBlockedBySupportPolicy {}
class ManualUpdateCheckFailed {
  final Object error;
  ManualUpdateCheckFailed(this.error);
}

class UpdateChecking {}
class UpdateDownloading {
  final int totalBytes;
  final int receivedBytes;
  UpdateDownloading(this.totalBytes, this.receivedBytes);
}
class UpdateInstalling {}

typedef DesktopUpdateLocalization = dynamic;

Future<DesktopUpdaterController> createDesktopUpdaterController({
  dynamic localization,
  Uri? appArchiveUrl,
}) async {
  throw UnsupportedError('Desktop updater is not supported on web.');
}

Future<void> recoverPendingDesktopInstall() async {}
