// Composes the launcher icons from separate glyph + background sources
// and emits the native resources. Pure Dart (no Flutter): runs with
// plain `dart`, locally or from the Gradle build.
//
// Sources (hand-made, one element each so future operating systems can
// scale/compose them with different proportions or shapes):
//   assets/images/icons/             <- foreground glyphs (SVG design)
//   assets/images/icons_backgrounds/ <- backgrounds (PNG)
//   assets/images/tray_icon.png       <- raster export of icon.svg (256px,
//                                        transparent). The pipeline reads
//                                        this instead of rasterizing the SVG
//                                        because SVG rasterization needs the
//                                        Flutter engine, which cannot run in
//                                        a headless Dart tool. If icon.svg
//                                        changes, re-export this PNG.
//
// Run automatically on every Android build (see
// android/app/build.gradle.kts `genLauncherIcons`), or manually with:
//   dart tool/gen_launcher_icons.dart
//
// Adding an icon: drop the glyph PNG + background PNG in the folders above,
// extend `iconSpecs` and AppIconCatalog.glyphs, add the l10n option label,
// rebuild. The composed full PNGs land in assets/images/icons/generated/
// (committed: the settings preview loads them at runtime) and are copied
// into the native resources by each target below.
//
// Only [AndroidTarget] is implemented. Other operating systems plug in as
// new [LauncherIconTarget]s with their own canvas size, glyph scale and
// emitter — no existing code needs to change.
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:image/image.dart' as img;

/// One composable icon: a glyph PNG drawn over a background PNG, or a
/// glyph SVG wrapping a single embedded bitmap (used as-is).
class IconSpec {
  /// Stable id, persisted in AppIconCatalog.iconKey.
  final String id;

  /// Foreground artwork: ready-made PNG, or SVG with an embedded
  /// `data:` bitmap (any MIME — some editors export `data:img/png`).
  final String glyph;

  /// Background artwork.
  final String background;

  /// Opacity applied to the glyph (from the SVG design, e.g. sakura).
  final double glyphOpacity;

  /// Base mipmap resource name for native targets.
  final String resource;

  /// Native `activity-alias`, or null for the icon as installed
  /// (MainActivity, no alias).
  final String? alias;

  const IconSpec({
    required this.id,
    required this.glyph,
    required this.background,
    required this.resource,
    this.alias,
    this.glyphOpacity = 1.0,
  });
}

const iconSpecs = [
  IconSpec(
    id: 'white',
    glyph: 'assets/images/tray_icon.png',
    background: 'assets/images/icons_backgrounds/icons_white_bg.png',
    resource: 'ic_launcher',
  ),
  IconSpec(
    id: 'dark',
    glyph: 'assets/images/tray_icon.png',
    background: 'assets/images/icons_backgrounds/icons_dark_bg.png',
    resource: 'ic_launcher_dark',
    alias: 'AppIconDark',
  ),
  IconSpec(
    id: 'sakura',
    glyph: 'assets/images/icons/icon_sakura.svg',
    background: 'assets/images/icons_backgrounds/icons_sakura_bg.png',
    resource: 'ic_launcher_sakura',
    alias: 'AppIconSakura',
    glyphOpacity: 0.84,
  ),
];

/// Composed full PNGs (also loaded by the settings preview at runtime).
String composedAsset(IconSpec spec) =>
    'assets/images/icons/generated/icon_${spec.id}.png';

/// A native target: canvas size, glyph scale and resource emitter.
/// Android shrinks the (large) glyphs to 50% and centers them.
abstract class LauncherIconTarget {
  String get name;
  int get canvasSize;
  double get glyphScale;
  Future<void> emit(Map<IconSpec, img.Image> composed);
}

const launcherTargets = <LauncherIconTarget>[AndroidTarget()];

/// Glyph artwork as a decoded image: plain PNGs load directly, SVGs
/// wrapping a single embedded bitmap contribute the decoded bitmap.
img.Image loadGlyph(IconSpec spec) {
  final raw = File(spec.glyph).readAsBytesSync();
  if (spec.glyph.endsWith('.svg')) {
    final svg = utf8.decode(raw);
    final raster = RegExp(
      r'data:[^;]+;base64,([A-Za-z0-9+/=]+)',
    ).firstMatch(svg);
    if (raster == null) {
      throw StateError('No embedded bitmap in ${spec.glyph}');
    }
    return img.decodeImage(base64Decode(raster.group(1)!))!;
  }
  return img.decodeImage(raw)!;
}

/// Shared compositor: background fills the canvas, glyph is fitted into the
/// [glyphScale] box, centered, with [glyphOpacity].
img.Image composeIcon({
  required img.Image glyph,
  required img.Image background,
  required int canvasSize,
  required double glyphScale,
  required double glyphOpacity,
}) {
  final canvas = img.copyResize(
    background,
    width: canvasSize,
    height: canvasSize,
  );
  final box = canvasSize * glyphScale;
  final scale = math.min(
    box / glyph.width.toDouble(),
    box / glyph.height.toDouble(),
  );
  final glyphBox = img.copyResize(
    glyph,
    width: (glyph.width * scale).round(),
    height: (glyph.height * scale).round(),
    interpolation: img.Interpolation.cubic,
  );
  if (glyphOpacity < 1.0) {
    for (var y = 0; y < glyphBox.height; y++) {
      for (var x = 0; x < glyphBox.width; x++) {
        final pixel = glyphBox.getPixel(x, y);
        glyphBox.setPixelRgba(
          x,
          y,
          pixel.r.toInt(),
          pixel.g.toInt(),
          pixel.b.toInt(),
          (pixel.a * glyphOpacity).round(),
        );
      }
    }
  }
  return img.compositeImage(
    canvas,
    glyphBox,
    dstX: ((canvasSize - glyphBox.width) / 2).round(),
    dstY: ((canvasSize - glyphBox.height) / 2).round(),
  );
}

void main() {
  const target = AndroidTarget();
  final composed = <IconSpec, img.Image>{};
  for (final spec in iconSpecs) {
    final glyph = loadGlyph(spec);
    final background = img.decodeImage(
      File(spec.background).readAsBytesSync(),
    )!;
    composed[spec] = composeIcon(
      glyph: glyph,
      background: background,
      canvasSize: target.canvasSize,
      glyphScale: target.glyphScale,
      glyphOpacity: spec.glyphOpacity,
    );
    stdout.writeln(
      '[gen] composed ${spec.id}: '
      '${composed[spec]!.width}x${composed[spec]!.height} '
      'from ${spec.glyph} over ${spec.background}',
    );
  }
  for (final target in launcherTargets) {
    target.emit(composed);
  }
}

/// Android: full-resolution PNGs in xxxhdpi only (the system downscales
/// for lower densities), adaptive XMLs, and the manifest aliases.
class AndroidTarget implements LauncherIconTarget {
  const AndroidTarget();

  static const resDir = 'android/app/src/main/res';
  static const manifestPath = 'android/app/src/main/AndroidManifest.xml';
  static const beginMarker = '<!-- BEGIN dynamic-launcher-icons';
  static const endMarker = '<!-- END dynamic-launcher-icons -->';

  static const mirrorFilters = '''
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="\${appScheme}" />
            </intent-filter>
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="\${appHost}" />
                <data android:scheme="https" android:host="\${webHost}" />
                <data android:scheme="https" android:host="\${authHost}" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="text/*" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="image/*" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="video/*" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="*/*" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND_MULTIPLE" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="image/*" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND_MULTIPLE" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="video/*" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND_MULTIPLE" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="*/*" />
            </intent-filter>''';

  @override
  String get name => 'android';

  @override
  int get canvasSize => 512;

  @override
  double get glyphScale => 0.5;

  static String _adaptiveXml(String resource) =>
      '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/${resource}_bg"/>
    <foreground android:drawable="@android:color/transparent"/>
</adaptive-icon>
''';

  static String _aliasBlock(String label, String resource, String comment) =>
      '''
        <!-- Launcher icon: $comment -->
        <activity-alias
            android:name=".AppIcon$label"
            android:enabled="false"
            android:exported="true"
            android:icon="@mipmap/$resource"
            android:roundIcon="@mipmap/$resource"
            android:targetActivity=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
$mirrorFilters
        </activity-alias>''';

  @override
  Future<void> emit(Map<IconSpec, img.Image> composed) async {
    for (final entry in composed.entries) {
      final spec = entry.key;
      final png = img.encodePng(entry.value);
      // The committed full PNG (settings preview loads it at runtime).
      File(composedAsset(spec))
        ..createSync(recursive: true)
        ..writeAsBytesSync(png);
      // Legacy icon + adaptive background (full-bleed artwork, the
      // adaptive foreground layer stays empty).
      for (final name in [spec.resource, '${spec.resource}_bg']) {
        File('$resDir/mipmap-xxxhdpi/$name.png')
          ..createSync(recursive: true)
          ..writeAsBytesSync(png);
      }
      File('$resDir/mipmap-anydpi-v26/${spec.resource}.xml')
        ..createSync(recursive: true)
        ..writeAsStringSync(_adaptiveXml(spec.resource));
      stdout.writeln('[android] icon ${spec.resource} <- ${spec.id}');
    }

    // The round icon of the installed (white) icon.
    final white = File('$resDir/mipmap-xxxhdpi/ic_launcher.png')
        .readAsBytesSync();
    for (final name in ['ic_launcher_round', 'ic_launcher_round_bg']) {
      File('$resDir/mipmap-xxxhdpi/$name.png')
        ..createSync(recursive: true)
        ..writeAsBytesSync(white);
    }
    File('$resDir/mipmap-anydpi-v26/ic_launcher_round.xml')
      ..createSync(recursive: true)
      ..writeAsStringSync(_adaptiveXml('ic_launcher_round'));

    // Emit the alias blocks into the manifest (replaces the BEGIN/END
    // region, preserving everything else).
    final manifest = File(manifestPath).readAsStringSync();
    final begin = manifest.indexOf(beginMarker);
    final end = manifest.indexOf(endMarker);
    if (begin == -1 || end == -1 || end < begin) {
      throw StateError('Manifest markers not found');
    }
    final blocks = iconSpecs
        .where((spec) => spec.alias != null)
        .map(
          (spec) => _aliasBlock(
            spec.alias!.replaceFirst('AppIcon', ''),
            spec.resource,
            spec.id,
          ),
        )
        .join('\n');
    final replacement =
        '''<!-- BEGIN dynamic-launcher-icons (generated by tool/gen_launcher_icons.dart) -->
$blocks
        <!-- END dynamic-launcher-icons -->''';
    File(manifestPath).writeAsStringSync(
      manifest.replaceRange(begin, end + endMarker.length, replacement),
    );
    stdout.writeln(
      '[android] manifest aliases: ${iconSpecs.where((s) => s.alias != null).map((s) => s.alias).join(', ')}',
    );
  }
}
