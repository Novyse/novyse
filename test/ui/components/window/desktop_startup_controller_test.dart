import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/config/global.dart';
import 'package:novyse/ui/components/window/desktop_startup_controller.dart';

void main() {
  group('DesktopStartupController', () {
    final autostartDir = Directory(
      '${Platform.environment['HOME']}/.config/autostart',
    );
    final desktopFile = File('${autostartDir.path}/$appId.desktop');

    setUp(() {
      if (desktopFile.existsSync()) desktopFile.deleteSync();
    });

    tearDown(() {
      if (desktopFile.existsSync()) desktopFile.deleteSync();
    });

    test('isSupported is true on desktop platforms', () {
      expect(DesktopStartupController.isSupported, isTrue);
    });

    test('setOpenOnStartup creates and removes autostart desktop entry on Linux', () async {
      // 1. Initially disabled
      expect(DesktopStartupController.isEnabled, isFalse);

      // 2. Enable with background mode
      final enabledOk = await DesktopStartupController.setOpenOnStartup(
        enabled: true,
        openInBackground: true,
      );
      expect(enabledOk, isTrue);
      expect(desktopFile.existsSync(), isTrue);
      expect(DesktopStartupController.isEnabled, isTrue);

      final content = desktopFile.readAsStringSync();
      expect(content, contains('[Desktop Entry]'));
      expect(content, contains('Type=Application'));
      expect(content, contains('--hidden'));
      expect(content, contains('StartupWMClass=novyse'));
      expect(content, contains('X-GNOME-Autostart-enabled=true'));
      expect(content, contains('Hidden=false'));

      // 3. Disable
      final disabledOk = await DesktopStartupController.setOpenOnStartup(
        enabled: false,
      );
      expect(disabledOk, isTrue);
      expect(desktopFile.existsSync(), isFalse);
      expect(DesktopStartupController.isEnabled, isFalse);
    });

    test('syncWithSettings synchronizes autostart configuration', () async {
      await DesktopStartupController.syncWithSettings(
        openOnStartup: true,
        openInBackground: false,
      );
      expect(desktopFile.existsSync(), isTrue);
      expect(DesktopStartupController.isEnabled, isTrue);

      final content = desktopFile.readAsStringSync();
      expect(content, isNot(contains('--hidden')));

      await DesktopStartupController.syncWithSettings(
        openOnStartup: false,
        openInBackground: false,
      );
      expect(desktopFile.existsSync(), isFalse);
      expect(DesktopStartupController.isEnabled, isFalse);
    });

    test('isEnabled respects GNOME/KDE disabled flags', () async {
      await DesktopStartupController.setOpenOnStartup(enabled: true);
      expect(DesktopStartupController.isEnabled, isTrue);

      // Simulate user disabling in GNOME settings
      desktopFile.writeAsStringSync(
        '[Desktop Entry]\nType=Application\nHidden=true\n',
      );
      expect(DesktopStartupController.isEnabled, isFalse);

      // Simulate user disabling with X-GNOME flag
      desktopFile.writeAsStringSync(
        '[Desktop Entry]\nType=Application\nX-GNOME-Autostart-enabled=false\n',
      );
      expect(DesktopStartupController.isEnabled, isFalse);
    });

    test('disabling does not delete other desktop files (e.g. production)', () async {
      final otherDesktopFile = File('${autostartDir.path}/com.novyse.desktop');
      try {
        otherDesktopFile.writeAsStringSync(
          '[Desktop Entry]\nType=Application\nName=Novyse Production\n',
        );

        await DesktopStartupController.setOpenOnStartup(enabled: true);
        expect(desktopFile.existsSync(), isTrue);
        expect(otherDesktopFile.existsSync(), isTrue);

        await DesktopStartupController.setOpenOnStartup(enabled: false);
        expect(desktopFile.existsSync(), isFalse);
        expect(otherDesktopFile.existsSync(), isTrue);
      } finally {
        if (otherDesktopFile.existsSync()) otherDesktopFile.deleteSync();
      }
    });
  });
}
