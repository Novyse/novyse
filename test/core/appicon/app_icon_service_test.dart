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

    // currentOS still reflects the host; force the desktop branch via
    // supportsDynamicIcons + applyIconId when OS is windows/linux/macos.
    // On a Windows host this exercises the desktop path.
    await service.applyIconId('sakura');
    if (currentOS == AppOS.windows ||
        currentOS == AppOS.linux ||
        currentOS == AppOS.macos) {
      expect(desktopId, 'sakura');
      expect(mobileAlias, isNull);
    }
  });

  test('applyAlias maps null to the default glyph id', () async {
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
    if (currentOS == AppOS.windows ||
        currentOS == AppOS.linux ||
        currentOS == AppOS.macos) {
      expect(applied, 'white');
    }
  });
}
