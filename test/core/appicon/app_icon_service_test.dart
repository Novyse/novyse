import 'package:flutter_test/flutter_test.dart';

import 'package:novyse/core/appicon/app_icon_service.dart';
import 'package:novyse/core/utils/platform.dart';

void main() {
  tearDown(() {
    debugOverridePlatform = null;
  });

  test('desktop apply goes through the desktop backend', () async {
    debugOverridePlatform = AppPlatform.desktop;
    String? desktopId;
    String? mobileAlias;
    final service = AppIconService(
      isSupported: () async => false,
      changeIcon: (alias) async => mobileAlias = alias,
      applyDesktop: (iconId) async {
        desktopId = iconId;
        return true;
      },
    );

    // debugOverridePlatform makes the desktop branch deterministic on any
    // host, so this exercises the desktop path everywhere.
    await service.applyIconId('sakura');
    expect(desktopId, 'sakura');
    expect(mobileAlias, isNull);
  });

  test('applyAlias maps null to the default glyph id', () async {
    debugOverridePlatform = AppPlatform.desktop;
    String? applied;
    final service = AppIconService(
      isSupported: () async => true,
      changeIcon: (alias) async {},
      applyDesktop: (iconId) async {
        applied = iconId;
        return true;
      },
    );
    await service.applyAlias(null);
    expect(applied, 'white');
  });
}
