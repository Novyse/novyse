/// Catalog of the launcher icons shipped with the app.
///
/// Icons are composed full PNGs under `assets/images/icons/generated/`,
/// generated at build time by `tool/gen_launcher_icons.dart` (not committed).
/// Mobile uses `flutter_dynamic_launcher_icon` (Android `activity-alias` /
/// iOS alternate App Icon sets) with the plated artwork in [asset].
/// Desktop only applies *themed* glyphs ([AppIconGlyph.appliesOnDesktop])
/// using [desktopAsset] / [desktopIcoAsset] (cutout, no plate); white/dark
/// keep the base Novyse logo.
library;

class AppIconGlyph {
  /// Stable id, persisted in [AppIconCatalog.iconKey].
  final String id;

  /// Plated PNG: settings preview + mobile launcher source.
  final String asset;

  /// Desktop cutout PNG (no plate). Null → use [AppIconCatalog.desktopBaseAsset].
  final String? desktopAsset;

  /// Desktop cutout ICO for Windows. Null → use base ICO.
  final String? desktopIcoAsset;

  /// Native alias name (Android activity-alias / iOS alternate set), or
  /// `null` for the icon as installed.
  final String? alias;

  /// When false, desktop keeps the base Novyse logo (white/dark). Themed
  /// icons like sakura set this to true.
  final bool appliesOnDesktop;

  const AppIconGlyph({
    required this.id,
    required this.asset,
    required this.alias,
    this.desktopAsset,
    this.desktopIcoAsset,
    this.appliesOnDesktop = false,
  });
}

class AppIconCatalog {
  AppIconCatalog._();

  /// Persisted key (local scope: the launcher icon is per-device).
  static const iconKey = 'appearance.appIconId';

  /// The icon as installed is the white one.
  static const defaultIconId = 'white';

  /// Desktop window/tray asset when white/dark (or unknown) is selected.
  static const desktopBaseAsset = 'assets/images/icons/generated/icon_base.png';
  static const desktopBaseIcoAsset =
      'assets/images/icons/generated/icon_base.ico';

  static const List<AppIconGlyph> glyphs = [
    AppIconGlyph(
      id: 'white',
      asset: 'assets/images/icons/generated/icon_white.png',
      alias: null,
    ),
    AppIconGlyph(
      id: 'dark',
      asset: 'assets/images/icons/generated/icon_dark.png',
      alias: 'AppIconDark',
    ),
    AppIconGlyph(
      id: 'sakura',
      asset: 'assets/images/icons/generated/icon_sakura.png',
      desktopAsset: 'assets/images/icons/generated/icon_sakura_desktop.png',
      desktopIcoAsset: 'assets/images/icons/generated/icon_sakura_desktop.ico',
      alias: 'AppIconSakura',
      appliesOnDesktop: true,
    ),
  ];

  static AppIconGlyph glyphById(String? id) {
    for (final glyph in glyphs) {
      if (glyph.id == id) return glyph;
    }
    return glyphs.first;
  }

  /// Options shown in the editor. On desktop, white+dark collapse into the
  /// single base logo (they apply the same artwork).
  static List<AppIconGlyph> pickerGlyphs({required bool desktop}) {
    if (!desktop) return glyphs;
    return [
      glyphs.first, // white stands in for the shared base logo
      for (final glyph in glyphs)
        if (glyph.appliesOnDesktop) glyph,
    ];
  }

  /// Whether [iconId] should highlight the desktop base (white) row.
  static bool isDesktopBaseSelection(String? iconId) {
    final id = iconId ?? defaultIconId;
    return id == defaultIconId || id == 'dark';
  }

  /// Preview asset for the current platform (plated mobile vs desktop cutout).
  static String previewAsset(AppIconGlyph glyph, {required bool desktop}) {
    if (!desktop) return glyph.asset;
    if (!glyph.appliesOnDesktop) return desktopBaseAsset;
    return glyph.desktopAsset ?? glyph.asset;
  }

  static String desktopArtwork(String iconId, {int size = 256}) => previewAsset(
    glyphById(iconId),
    desktop: true,
  ).replaceFirst(RegExp(r'\.png$'), '_$size.png');

  /// Native alias for a logical choice, or `null` to reset to the icon
  /// as installed. Unknown ids fall back to the default (white) glyph,
  /// i.e. a reset.
  static String? resolveAlias({required String iconId}) =>
      glyphById(iconId).alias;

  /// Lowercase mipmap/adaptive-icon resource for an [alias].
  static String resourceNameForAlias(String alias) {
    final snake = alias
        .replaceAllMapped(
          RegExp('(?<!^)[A-Z]'),
          (m) => '_${m.group(0)!.toLowerCase()}',
        )
        .toLowerCase();
    return snake.replaceFirst('app_icon', 'ic_launcher');
  }

  /// All native aliases generated for the current catalog
  /// (every glyph except the default one).
  static List<String> get allAliases => [
    for (final glyph in glyphs)
      if (glyph.alias != null) glyph.alias!,
  ];

  /// Reverse lookup: alias -> glyph id.
  ///
  /// `null` (reported by the plugin for the icon as installed) maps to
  /// the default glyph; any other unknown alias maps to `null`.
  static String? selectionForAlias(String? alias) {
    if (alias == null) return defaultIconId;
    for (final glyph in glyphs) {
      if (alias == glyph.alias) return glyph.id;
    }
    return null;
  }
}
