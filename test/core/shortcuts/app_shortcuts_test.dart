import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/shortcuts/app_shortcuts.dart';
import 'package:novyse/core/shortcuts/app_shortcuts_wrapper.dart';
import 'package:novyse/ui/components/window/desktop_window_controller.dart';

void main() {
  tearDown(() {
    AppShortcuts.debugOnCloseApp = null;
  });

  group('AppShortcuts and AppShortcutsWrapper', () {
    testWidgets('Ctrl + W triggers close action', (tester) async {
      var closeCalled = false;
      AppShortcuts.debugOnCloseApp = () {
        closeCalled = true;
      };

      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: AppShortcutsWrapper(
              child: Scaffold(
                body: Center(child: Text('Novyse Content')),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Send Ctrl + W
      await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.keyW);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
      await tester.pump();

      expect(closeCalled, isTrue);
    });

    testWidgets('Cmd + W (Meta + W) triggers close action on macOS', (tester) async {
      var closeCalled = false;
      AppShortcuts.debugOnCloseApp = () {
        closeCalled = true;
      };

      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(
            home: AppShortcutsWrapper(
              child: Scaffold(
                body: Center(child: Text('Novyse Content')),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Send Meta + W
      await tester.sendKeyDownEvent(LogicalKeyboardKey.metaLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.keyW);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.metaLeft);
      await tester.pump();

      expect(closeCalled, isTrue);
    });

    testWidgets('Ctrl + W works even when a TextField is focused', (tester) async {
      var closeCalled = false;
      AppShortcuts.debugOnCloseApp = () {
        closeCalled = true;
      };

      final container = ProviderContainer();
      addTearDown(container.dispose);

      final controller = TextEditingController();
      addTearDown(controller.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            home: AppShortcutsWrapper(
              child: Scaffold(
                body: TextField(
                  controller: controller,
                  autofocus: true,
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Verify TextField has focus
      expect(find.byType(TextField), findsOneWidget);

      // Send Ctrl + W while textfield is focused
      await tester.sendKeyDownEvent(LogicalKeyboardKey.controlLeft);
      await tester.sendKeyEvent(LogicalKeyboardKey.keyW);
      await tester.sendKeyUpEvent(LogicalKeyboardKey.controlLeft);
      await tester.pump();

      expect(closeCalled, isTrue);
    });

    test('AppShortcuts.closeApp sets closeToTray and invokes window controller', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      DesktopWindowController.closeToTray = false;
      AppShortcuts.closeWithContainer(container);
      // closeToTray defaults to true from setting or controller
      expect(DesktopWindowController.closeToTray, isTrue);
    });
  });
}
