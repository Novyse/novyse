import 'dart:io';

import 'package:path/path.dart' as path;

/// Resolves a Flutter asset to an on-disk path (desktop native APIs).
///
/// Mirrors `nativeapi_flutter`'s [ImageAsset.fromAsset] layout so tray and
/// `Application.setIcon` see the same files.
abstract final class AppIconBundle {
  static String? resolveAssetPath(String asset) {
    final executablePath = Platform.resolvedExecutable;
    var assetPath = path.joinAll([
      path.dirname(executablePath),
      'data',
      'flutter_assets',
      asset,
    ]);
    if (Platform.isMacOS) {
      assetPath = path.join(
        path.dirname(path.dirname(executablePath)),
        'Frameworks',
        'App.framework',
        'Resources',
        'flutter_assets',
        asset,
      );
    }
    if (!File(assetPath).existsSync()) return null;
    return assetPath;
  }
}
