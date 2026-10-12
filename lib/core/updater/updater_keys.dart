library;

import '../config/global.dart' as config;

/// Public Ed25519 keys trusted for production desktop update metadata.
///
/// Automatically synchronized from desktop_updater.keys.json via
/// `scripts/sync-update-keys.sh`.
const trustedReleasePublicKeys = <String, String>{
  'release-689c861f78cd1ea3dddb5d84':
      'qqLWN1e+CheqM0NUbV3/593VffzmWQKUbD6ROFXpiK0=',
};

/// Stable production feed URL (GitHub Release asset, single channel).
///
/// Pulls default feed URL from [config.desktopUpdaterArchiveUrl] in global.dart.
final Uri productionAppArchiveUrl = Uri.parse(
  config.desktopUpdaterArchiveUrl,
);
