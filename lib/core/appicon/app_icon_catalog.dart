/// Catalog of the launcher icons shipped with the app.
///
/// Icons are hand-made full PNGs under `assets/images/mobile_icons/`.
/// Nothing is composed from a glyph + color, neither at runtime nor at
/// build time (the generator only resizes the PNGs into density buckets).
/// `flutter_dynamic_launcher_icon` only switches between pre-built native
/// icons (Android `activity-alias` entries backed by mipmap resources):
/// every non-default icon below maps to one native alias — see
/// `android/app/src/main/AndroidManifest.xml` and
/// `tool/README_app_icons.md` for how they are produced.
///
/// Logical model (what the user picks): one glyph ([AppIconGlyph.id]).
/// [AppIconCatalog.resolveAlias] turns that choice into the native alias
/// name, or `null` to reset to the icon as installed (MainActivity).
library;

class AppIconGlyph {
  /// Stable id, persisted in [AppIconCatalog.iconKey].
  final String id;

  /// Ready-made artwork shown in the editor and resized into the native
  /// mipmap resources by `tool/gen_launcher_icons.dart`.
  final String asset;

  /// Native `activity-alias` name, or `null` for the icon as installed
  /// (selecting it calls `changeIcon(null)` and re-enables MainActivity).
  final String? alias;

  const AppIconGlyph({
    required this.id,
    required this.asset,
    required this.alias,
  });
}

class AppIconCatalog {
  AppIconCatalog._();

  /// Persisted key (local scope: the launcher icon is per-device).
  static const iconKey = 'appearance.appIconId';

  /// The icon as installed is the white one.
  static const defaultIconId = 'white';

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
      alias: 'AppIconSakura',
    ),
  ];

  static AppIconGlyph glyphById(String? id) {
    for (final glyph in glyphs) {
      if (glyph.id == id) return glyph;
    }
    return glyphs.first;
  }

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
