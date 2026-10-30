import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/comms_share_config.dart';
import 'package:novyse/core/l10n/app_localizations_en.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/comms/screen_share_edit_modal.dart';
import 'package:novyse/ui/components/comms/screen_share_selector_modal.dart';

/// The desktop capturer is behind the `FlutterWebRTC.Method` channel, so
/// mocking that channel drives the custom-picker branch.
void main() {
  const channel = MethodChannel('FlutterWebRTC.Method');

  final en = AppLocalizationsEn();

  /// The custom-picker branch is active only where the OS does not provide a
  /// native picker (desktop X11/macOS/Windows). On Wayland/web/mobile the edit
  /// menu delegates to the OS selector (which already has the preview).
  final customPicker = ScreenShareSelectorModal.useCustomPicker;

  final requestedTypes = <List<dynamic>>[];

  void mockCapturer(List<Map<String, dynamic>>? sources) {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      if (call.method != 'getDesktopSources') return null;
      requestedTypes.add((call.arguments as Map)['types'] as List<dynamic>);
      if (sources == null) {
        throw PlatformException(code: 'UNSUPPORTED');
      }
      return {'sources': sources};
    });
  }

  final validThumbnail = base64Decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  );

  Map<String, dynamic> source(String id, String name) => {
    'id': id,
    'name': name,
    'type': 'screen',
    'thumbnailSize': {'width': 320, 'height': 180, 'scaleFactor': 1.0},
    'thumbnail': validThumbnail,
  };

  Future<void> pump(WidgetTester tester,
      {ScreenShareConfig? current, String? currentSourceId}) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: ScreenShareEditModal(
            current: current ?? const ScreenShareConfig(),
            hasAudio: false,
            currentSourceId: currentSourceId,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  setUp(() => requestedTypes.clear());

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  group('header', () {
    testWidgets('shows no title of its own', (tester) async {
      mockCapturer(const []);
      await pump(tester);

      // The title belongs to ResponsiveOverlay.show(); this widget is only
      // the body.
      expect(find.text(en.screenShareEditTitle), findsNothing);
    });

    testWidgets('offers cancel and apply actions', (tester) async {
      mockCapturer(const []);
      await pump(tester);

      expect(find.widgetWithText(AppButton, en.cancel), findsOneWidget);
      expect(find.widgetWithText(AppButton, en.screenShareApply), findsOneWidget);
    });
  });

  group('system audio', () {
    testWidgets('is available and toggles', (tester) async {
      mockCapturer(const []);
      await pump(tester);

      expect(find.byType(Checkbox), findsOneWidget);
      expect(find.text(en.screenShareIncludeSystemAudio), findsOneWidget);

      final checkbox = tester.widget<Checkbox>(find.byType(Checkbox));
      expect(checkbox.value, isFalse);

      await tester.tap(find.byType(Checkbox));
      await tester.pump();
      expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, isTrue);
    });
  });

  group('custom picker session', () {
    testWidgets('is skipped on native-picker platforms', (tester) async {
      if (customPicker) return;
      mockCapturer(const []);
      await pump(tester);

      // On platforms with a native picker there is no source list here;
      // source selection goes to the selector (with preview).
      expect(find.byType(Image), findsNothing);
      expect(find.text(en.screenSharePreview), findsNothing);
    });

    testWidgets('shows the preview header', (tester) async {
      if (!customPicker) return;
      mockCapturer([source('s1', 'Screen 1')]);
      await pump(tester);

      expect(find.text(en.screenSharePreview), findsOneWidget);
    });

    testWidgets('lists each source by name', (tester) async {
      if (!customPicker) return;
      mockCapturer([source('s1', 'Screen 1'), source('s2', 'Screen 2')]);
      await pump(tester);

      expect(find.text('Screen 1'), findsOneWidget);
      expect(find.text('Screen 2'), findsOneWidget);
    });

    testWidgets('renders a thumbnail image per source', (tester) async {
      if (!customPicker) return;
      mockCapturer([source('s1', 'Screen 1')]);
      await pump(tester);

      expect(find.byType(Image), findsOneWidget);
    });

    testWidgets('requests screen and window source types', (tester) async {
      if (!customPicker) return;
      mockCapturer([source('s1', 'Screen 1')]);
      await pump(tester);

      expect(requestedTypes, contains(['screen', 'window']));
    });

    testWidgets('a platform failure renders no sources', (tester) async {
      if (!customPicker) return;
      mockCapturer(null);
      await pump(tester);

      expect(find.byType(Image), findsNothing);
      expect(find.text(en.screenSharePreview), findsOneWidget);
    });
  });
}
