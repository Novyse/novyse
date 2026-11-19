import 'package:web/web.dart' as web;

/// Swaps the browser favicon with the selected catalog glyph.
///
/// Flutter serves bundled assets under `assets/`, so the catalog asset
/// `assets/images/icons/generated/icon_dark.png` is reachable at
/// `<base href>/assets/assets/images/icons/generated/icon_dark.png`.
/// Only the tab icon changes: the PWA manifest icons and the apple-touch-icon
/// are static files shipped with the web build.
abstract final class AppIconFavicon {
  static Future<bool> applyAsset(String asset) async {
    final link = web.document.querySelector('link[rel~="icon"]');
    if (link == null) return false;
    final href = Uri.parse(web.document.baseURI)
        .resolve('assets/$asset')
        .toString();
    link
      ..setAttribute('rel', 'icon')
      ..setAttribute('type', 'image/png')
      ..setAttribute('href', href);
    return true;
  }
}
