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
// Targets: Android mipmaps/aliases, desktop ICO (Windows SetIcon), and iOS
// alternate AppIcon sets. Other OSes reuse the committed composed PNGs.
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'package:image/image.dart' as img;

/// How [composeIcon] combines glyph + background.
enum ComposeMode {
  /// Draw the glyph (its own colors) centered on the background.
  overlay,

  /// Photoshop-style clipping mask: the Novyse silhouette stamps a fill onto
  /// a flat plate. Near-solid plates keep the glyph's own gradient.
  mask,

  /// Only the logo silhouette, filled with the background image — no plate
  /// around it (transparent outside the "N"). Used for themed icons like
  /// sakura on desktop.
  maskCutout,
}

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

  final ComposeMode mode;

  /// Also emit a desktop-only cutout (`icon_<id>_desktop.png/.ico`) with no
  /// plate. Mobile keeps [mode] (usually [ComposeMode.mask] with plate).
  final bool desktopCutout;

  const IconSpec({
    required this.id,
    required this.glyph,
    required this.background,
    required this.resource,
    this.alias,
    this.glyphOpacity = 1.0,
    this.mode = ComposeMode.overlay,
    this.desktopCutout = false,
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
    // Mobile/iOS: original overlay (sakura glyph on sakura bg). Untouched.
    // Desktop-only: separate cutout of the Novyse "N" filled with sakura art.
    glyph: 'assets/images/icons/icon_sakura.svg',
    background: 'assets/images/icons_backgrounds/icons_sakura_bg.png',
    resource: 'ic_launcher_sakura',
    alias: 'AppIconSakura',
    glyphOpacity: 0.84,
    mode: ComposeMode.overlay,
    desktopCutout: true,
  ),
];

/// Composed full PNGs (also loaded by the settings preview at runtime).
String composedAsset(IconSpec spec) =>
    'assets/images/icons/generated/icon_${spec.id}.png';

String desktopCutoutAsset(IconSpec spec) =>
    'assets/images/icons/generated/icon_${spec.id}_desktop.png';

String desktopCutoutIcoAsset(IconSpec spec) =>
    'assets/images/icons/generated/icon_${spec.id}_desktop.ico';

/// A native target: canvas size, glyph scale and resource emitter.
/// Android shrinks the (large) glyphs to 50% and centers them.
abstract class LauncherIconTarget {
  String get name;
  int get canvasSize;
  double get glyphScale;
  Future<void> emit(Map<IconSpec, img.Image> composed);
}

const launcherTargets = <LauncherIconTarget>[
  AndroidTarget(),
  IosAlternateTarget(),
];

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

/// Alpha for masking: prefer the PNG alpha; if the glyph sits on an opaque
/// near-black plate (common export), treat dark pixels as transparent.
int _maskAlpha(img.Pixel pixel) {
  final a = pixel.a.toInt();
  if (a < 250) return a;
  final lum = (0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b);
  if (lum < 18) return 0;
  return a;
}

/// Rough luma variance — near-solid plates (white/dark) score low; sakura high.
double _lumaVariance(img.Image image) {
  var sum = 0.0;
  var sumSq = 0.0;
  final n = image.width * image.height;
  if (n == 0) return 0;
  for (final p in image) {
    final lum = 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b;
    sum += lum;
    sumSq += lum * lum;
  }
  final mean = sum / n;
  return sumSq / n - mean * mean;
}

img.ColorRgba8 _cornerAverage(img.Image image) {
  final samples = <img.Pixel>[
    image.getPixel(0, 0),
    image.getPixel(image.width - 1, 0),
    image.getPixel(0, image.height - 1),
    image.getPixel(image.width - 1, image.height - 1),
  ];
  var r = 0, g = 0, b = 0;
  for (final p in samples) {
    r += p.r.toInt();
    g += p.g.toInt();
    b += p.b.toInt();
  }
  return img.ColorRgba8(r ~/ 4, g ~/ 4, b ~/ 4, 255);
}

/// Shared compositor: background plate + glyph (overlay or clipping mask).
img.Image composeIcon({
  required img.Image glyph,
  required img.Image background,
  required int canvasSize,
  required double glyphScale,
  required double glyphOpacity,
  ComposeMode mode = ComposeMode.mask,
}) {
  // Cutouts trim empty padding first so scale 1.0 actually fills the canvas
  // (the source logo is padded). Overlay/mask keep the legacy fit behavior.
  final sourceGlyph =
      mode == ComposeMode.maskCutout ? trimGlyphToMask(glyph) : glyph;
  final box = canvasSize * glyphScale;
  final scale = math.min(
    box / sourceGlyph.width.toDouble(),
    box / sourceGlyph.height.toDouble(),
  );
  final glyphBox = img.copyResize(
    sourceGlyph,
    width: math.max(1, (sourceGlyph.width * scale).round()),
    height: math.max(1, (sourceGlyph.height * scale).round()),
    interpolation: img.Interpolation.cubic,
  );
  final dstX = ((canvasSize - glyphBox.width) / 2).round();
  final dstY = ((canvasSize - glyphBox.height) / 2).round();

  if (mode == ComposeMode.overlay) {
    final canvas = img.copyResize(
      background,
      width: canvasSize,
      height: canvasSize,
    );
    if (glyphOpacity < 1.0) {
      for (final p in glyphBox) {
        p.a = (p.a * glyphOpacity).round();
      }
    }
    return img.compositeImage(canvas, glyphBox, dstX: dstX, dstY: dstY);
  }

  final bgFull = img.copyResize(
    background,
    width: canvasSize,
    height: canvasSize,
    interpolation: img.Interpolation.cubic,
  );
  final cutout = mode == ComposeMode.maskCutout;
  final canvas = img.Image(
    width: canvasSize,
    height: canvasSize,
    numChannels: 4,
  );
  if (cutout) {
    img.fill(canvas, color: img.ColorRgba8(0, 0, 0, 0));
  } else {
    img.fill(canvas, color: _cornerAverage(bgFull));
  }

  // Textured fills (sakura) always stamp the background; near-solid plates
  // keep the glyph gradient so the logo stays visible.
  final fillWithBackground = cutout || _lumaVariance(background) > 80;
  final stamp = img.Image(
    width: glyphBox.width,
    height: glyphBox.height,
    numChannels: 4,
  );
  for (var y = 0; y < glyphBox.height; y++) {
    for (var x = 0; x < glyphBox.width; x++) {
      final g = glyphBox.getPixel(x, y);
      final a = (_maskAlpha(g) * glyphOpacity).round().clamp(0, 255);
      if (a == 0) {
        stamp.setPixelRgba(x, y, 0, 0, 0, 0);
        continue;
      }
      if (fillWithBackground) {
        final bx = (dstX + x).clamp(0, canvasSize - 1);
        final by = (dstY + y).clamp(0, canvasSize - 1);
        final b = bgFull.getPixel(bx, by);
        stamp.setPixelRgba(x, y, b.r.toInt(), b.g.toInt(), b.b.toInt(), a);
      } else {
        stamp.setPixelRgba(x, y, g.r.toInt(), g.g.toInt(), g.b.toInt(), a);
      }
    }
  }
  return img.compositeImage(canvas, stamp, dstX: dstX, dstY: dstY);
}

/// Crops away near-black / transparent padding so the "N" can fill the canvas.
/// The source logo is 1024² with a lot of empty margin — without this trim,
/// even scale 1.0 leaves the glyph tiny in the taskbar.
img.Image trimGlyphToMask(img.Image glyph) {
  var minX = glyph.width;
  var minY = glyph.height;
  var maxX = -1;
  var maxY = -1;
  for (var y = 0; y < glyph.height; y++) {
    for (var x = 0; x < glyph.width; x++) {
      if (_maskAlpha(glyph.getPixel(x, y)) == 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < minX || maxY < minY) return glyph;
  return img.copyCrop(
    glyph,
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  );
}

/// Fits [glyph] into [canvasSize] after trimming padding. [fill] is how much
/// of the canvas the opaque silhouette should cover (1.0 = edge to edge).
img.Image _desktopFitGlyph(img.Image glyph, int canvasSize, double fill) {
  final trimmed = trimGlyphToMask(glyph);
  final box = canvasSize * fill;
  final scale = math.min(
    box / trimmed.width.toDouble(),
    box / trimmed.height.toDouble(),
  );
  return img.copyResize(
    trimmed,
    width: math.max(1, (trimmed.width * scale).round()),
    height: math.max(1, (trimmed.height * scale).round()),
    interpolation: img.Interpolation.cubic,
  );
}

/// Base desktop logo: Novyse "N" alone (transparent plate), used when white
/// or dark is selected on desktop.
img.Image composeBaseLogo({
  required img.Image glyph,
  required int canvasSize,
  required double glyphScale,
}) {
  final glyphBox = _desktopFitGlyph(glyph, canvasSize, glyphScale);
  final canvas = img.Image(
    width: canvasSize,
    height: canvasSize,
    numChannels: 4,
  );
  img.fill(canvas, color: img.ColorRgba8(0, 0, 0, 0));
  final stamp = img.Image(
    width: glyphBox.width,
    height: glyphBox.height,
    numChannels: 4,
  );
  for (var y = 0; y < glyphBox.height; y++) {
    for (var x = 0; x < glyphBox.width; x++) {
      final g = glyphBox.getPixel(x, y);
      final a = _maskAlpha(g);
      if (a == 0) {
        stamp.setPixelRgba(x, y, 0, 0, 0, 0);
      } else {
        stamp.setPixelRgba(x, y, g.r.toInt(), g.g.toInt(), g.b.toInt(), a);
      }
    }
  }
  return img.compositeImage(
    canvas,
    stamp,
    dstX: ((canvasSize - glyphBox.width) / 2).round(),
    dstY: ((canvasSize - glyphBox.height) / 2).round(),
  );
}

void main() {
  // Compose once at the Android canvas size; other targets resize from that.
  const composeTarget = AndroidTarget();
  final composed = <IconSpec, img.Image>{};
  for (final spec in iconSpecs) {
    final glyph = loadGlyph(spec);
    final background = img.decodeImage(
      File(spec.background).readAsBytesSync(),
    )!;
    composed[spec] = composeIcon(
      glyph: glyph,
      background: background,
      canvasSize: composeTarget.canvasSize,
      glyphScale: composeTarget.glyphScale,
      glyphOpacity: spec.glyphOpacity,
      mode: spec.mode,
    );
    stdout.writeln(
      '[gen] composed ${spec.id} (${spec.mode.name}): '
      '${composed[spec]!.width}x${composed[spec]!.height} '
      'from ${spec.glyph} × ${spec.background}',
    );
  }
  // Desktop assets use the large Novyse logo (1024), trimmed of padding, then
  // fitted to fill the canvas so the taskbar/dock "N" is actually large.
  // Mobile composed icons above are unchanged (glyphScale 0.5).
  const desktopGlyphPath = 'assets/images/novyse-icon-logo.png';
  const desktopCanvasSize = 1024;
  // Leave a bit of margin so the "N" isn't edge-to-edge in the taskbar.
  const desktopGlyphScale = 0.82;
  final desktopGlyph = img.decodeImage(
    File(desktopGlyphPath).readAsBytesSync(),
  )!;
  final baseLogo = composeBaseLogo(
    glyph: desktopGlyph,
    canvasSize: desktopCanvasSize,
    glyphScale: desktopGlyphScale,
  );
  File('assets/images/icons/generated/icon_base.png')
    ..createSync(recursive: true)
    ..writeAsBytesSync(img.encodePng(baseLogo));
  final baseIco = img.IcoEncoder().encodeImages([
    for (final size in DesktopIcoSizes.values)
      img.copyResize(
        baseLogo,
        width: size,
        height: size,
        interpolation: img.Interpolation.cubic,
      ),
  ]);
  File('assets/images/icons/generated/icon_base.ico')
    ..createSync(recursive: true)
    ..writeAsBytesSync(baseIco);
  stdout.writeln(
    '[gen] desktop base logo ← $desktopGlyphPath '
    '@ ${desktopGlyphScale}x$desktopCanvasSize → icon_base.png / .ico',
  );

  // Desktop-only cutouts (no plate). Must not touch Android/iOS assets.
  for (final spec in iconSpecs) {
    if (!spec.desktopCutout) continue;
    final background = img.decodeImage(
      File(spec.background).readAsBytesSync(),
    )!;
    final cutout = composeIcon(
      glyph: desktopGlyph,
      background: background,
      canvasSize: desktopCanvasSize,
      glyphScale: desktopGlyphScale,
      glyphOpacity: 1.0,
      mode: ComposeMode.maskCutout,
    );
    File(desktopCutoutAsset(spec))
      ..createSync(recursive: true)
      ..writeAsBytesSync(img.encodePng(cutout));
    final ico = img.IcoEncoder().encodeImages([
      for (final size in DesktopIcoSizes.values)
        img.copyResize(
          cutout,
          width: size,
          height: size,
          interpolation: img.Interpolation.cubic,
        ),
    ]);
    File(desktopCutoutIcoAsset(spec))
      ..createSync(recursive: true)
      ..writeAsBytesSync(ico);
    stdout.writeln(
      '[gen] desktop cutout ${spec.id} ← $desktopGlyphPath '
      '× ${spec.background} → ${desktopCutoutAsset(spec)}',
    );
  }

  for (final target in launcherTargets) {
    target.emit(composed);
  }
}

/// Multi-size ICO frames for Windows `Application.setIcon`.
abstract final class DesktopIcoSizes {
  static const values = [16, 32, 48, 256];
}

/// iOS alternate icons (`ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES`).
/// Single-size 1024×1024 — Xcode generates every device variant.
class IosAlternateTarget implements LauncherIconTarget {
  const IosAlternateTarget();

  static const outRoot = 'ios/Runner/Assets.xcassets';
  static const fileName = 'Icon-App-1024x1024.png';

  @override
  String get name => 'ios-alternate';

  @override
  int get canvasSize => 1024;

  @override
  double get glyphScale => 0.5;

  @override
  Future<void> emit(Map<IconSpec, img.Image> composed) async {
    for (final entry in composed.entries) {
      final spec = entry.key;
      if (spec.alias == null) continue;
      final setName = spec.alias!;
      final dir = Directory('$outRoot/$setName.appiconset');
      if (dir.existsSync()) {
        // Drop the old all-sizes matrix if we previously generated it.
        for (final entity in dir.listSync()) {
          if (entity is File) entity.deleteSync();
        }
      } else {
        dir.createSync(recursive: true);
      }
      final png = img.encodePng(
        img.copyResize(
          entry.value,
          width: 1024,
          height: 1024,
          interpolation: img.Interpolation.cubic,
        ),
      );
      File('${dir.path}/$fileName').writeAsBytesSync(png);
      File('${dir.path}/Contents.json').writeAsStringSync(
        const JsonEncoder.withIndent('  ').convert({
          'images': [
            {
              'filename': fileName,
              'idiom': 'universal',
              'platform': 'ios',
              'size': '1024x1024',
            },
          ],
          'info': {'version': 1, 'author': 'xcode'},
        }),
      );
      stdout.writeln('[ios] alternate icon set $setName (single 1024)');
    }
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
      // Committed full PNG (settings preview + mobile source).
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
