// Guards the Android manifest against drift from [AppIconCatalog]:
// every alias must be declared as an `activity-alias` with the launcher
// filter and the icon resources the catalog resolves to. The default
// (installed) icon is MainActivity itself: it needs no alias, only the
// base mipmap resources.
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:novyse/core/appicon/app_icon_catalog.dart';

void main() {
  test('manifest declares every launcher icon alias', () {
    final manifest = File(
      'android/app/src/main/AndroidManifest.xml',
    ).readAsStringSync();
    for (final alias in AppIconCatalog.allAliases) {
      final resource = AppIconCatalog.resourceNameForAlias(alias);
      expect(
        manifest,
        contains('android:name=".$alias"'),
        reason: 'missing activity-alias $alias',
      );
      expect(
        manifest,
        contains('@mipmap/$resource'),
        reason: 'missing icon resource for $alias',
      );
    }
    // Each alias must expose the launcher filter: check the segment
    // between its declaration and its closing tag.
    for (final alias in AppIconCatalog.allAliases) {
      final start = manifest.indexOf('android:name=".$alias"');
      expect(start, isNot(-1), reason: 'missing activity-alias $alias');
      final end = manifest.indexOf('</activity-alias>', start);
      expect(end, isNot(-1), reason: 'unterminated activity-alias $alias');
      expect(
        manifest.substring(start, end),
        contains('android.intent.category.LAUNCHER'),
        reason: 'missing LAUNCHER filter for $alias',
      );
    }
    // No alias for the default icon: MainActivity stays the entry point.
    expect(manifest, isNot(contains('AppIconWhite')));
  });

  test('adaptive icon XMLs exist for every alias and the default icon', () {
    final resources = [
      'ic_launcher',
      'ic_launcher_round',
      for (final alias in AppIconCatalog.allAliases)
        AppIconCatalog.resourceNameForAlias(alias),
    ];
    for (final resource in resources) {
      expect(
        File(
          'android/app/src/main/res/mipmap-anydpi-v26/$resource.xml',
        ).existsSync(),
        isTrue,
        reason: 'missing adaptive icon $resource.xml',
      );
    }
  });

  test('full-resolution PNGs exist for every icon', () {
    // Only the xxxhdpi bucket is generated, at full source resolution:
    // Android downscales to lower densities automatically.
    const density = 'xxxhdpi';
    final resources = [
      'ic_launcher',
      'ic_launcher_round',
      for (final alias in AppIconCatalog.allAliases)
        AppIconCatalog.resourceNameForAlias(alias),
    ];
    for (final resource in resources) {
      expect(
        File('android/app/src/main/res/mipmap-$density/$resource.png')
            .existsSync(),
        isTrue,
        reason: 'missing mipmap-$density/$resource.png',
      );
      expect(
        File('android/app/src/main/res/mipmap-$density/${resource}_bg.png')
            .existsSync(),
        isTrue,
        reason: 'missing mipmap-$density/${resource}_bg.png',
      );
    }
  });

  test('no generated glyph/color leftovers remain', () {
    final resDir = Directory('android/app/src/main/res');
    final leftovers = resDir
        .listSync(recursive: true)
        .whereType<File>()
        .map((f) => f.path.replaceAll('\\', '/'))
        .where(
          (p) =>
              p.contains('ic_launcher_classic') ||
              p.contains('ic_launcher_dots') ||
              p.contains('ic_launcher_custom') ||
              p.contains('ic_launcher_foreground') ||
              p.endsWith('app_icon_colors.xml') ||
              p.endsWith('ic_launcher_background.xml'),
        )
        .toList();
    expect(leftovers, isEmpty, reason: 'obsolete resources: $leftovers');
  });
}
