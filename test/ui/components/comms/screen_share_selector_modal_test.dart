import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/comms_share_config.dart';
import 'package:novyse/core/l10n/app_localizations_en.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/comms/screen_share_quality_fields.dart';
import 'package:novyse/ui/components/comms/screen_share_selector_modal.dart';

/// The desktop capturer lives behind the `FlutterWebRTC.Method` channel, so
/// mocking that channel drives the custom-picker branch.
///
/// Which branch is live depends on the host session: on Wayland the OS already
/// provides a picker, so the modal delegates to it and only renders the notice.
/// These tests therefore assert whichever branch
/// [ScreenShareSelectorModal.hasNativePicker] reports, so the suite is valid on
/// a Wayland desktop and on a plain X11/CI machine alike.
void main() {
  const channel = MethodChannel('FlutterWebRTC.Method');

  // The test app runs in English, so compare against the English strings.
  final en = AppLocalizationsEn();

  /// Whether the host defers to the OS picker.
  final nativePicker = ScreenShareSelectorModal.hasNativePicker;

  /// Every `getDesktopSources` invocation, so the requested type is assertable.
  final requestedTypes = <List<dynamic>>[];

  /// Replies to `getDesktopSources` with [sources]; a null [sources] throws,
  /// simulating a platform failure.
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

  /// One fake screen source.
  Map<String, dynamic> source(String id, String name) => {
    'id': id,
    'name': name,
    'type': 'screen',
    'thumbnailSize': {'width': 320, 'height': 180, 'scaleFactor': 1.0},
    'thumbnail': Uint8List.fromList([1, 2, 3]),
  };

  /// Pumps the modal and settles.
  Future<void> pump(WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: SingleChildScrollView(
            child: ScreenShareSelectorModal(initial: ScreenShareConfig()),
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
    testWidgets('shows the title and a close button', (tester) async {
      mockCapturer(const []);
      await pump(tester);

      expect(find.text(en.screenShareSetupTitle), findsOneWidget);
      expect(find.byIcon(Icons.close_rounded), findsOneWidget);
    });

    testWidgets('offers cancel and start actions', (tester) async {
      mockCapturer(const []);
      await pump(tester);

      expect(find.widgetWithText(AppButton, en.cancel), findsOneWidget);
      expect(
        find.widgetWithText(AppButton, en.screenShareStart),
        findsOneWidget,
      );
    });
  });

  group('system audio', () {
    testWidgets('is available', (tester) async {
      mockCapturer(const []);
      await pump(tester);

      // Offered for a full-screen share, and unconditionally when the OS
      // picker is used.
      expect(find.byType(Checkbox), findsOneWidget);
      expect(find.text(en.screenShareIncludeSystemAudio), findsOneWidget);
    });

    testWidgets('starts unchecked and toggles', (tester) async {
      mockCapturer(const []);
      await pump(tester);

      expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, isFalse);

      await tester.tap(find.byType(Checkbox));
      await tester.pump();

      expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, isTrue);
    });
  });

  group('native picker session', () {
    // The Wayland path requests the OS picker on open and shows a preview.
    // In tests there is no display media, so capture fails and the modal
    // offers a retry while keeping start disabled.
    testWidgets('shows the preview area with retry on capture failure', (
      tester,
    ) async {
      if (!nativePicker) return;
      mockCapturer(const []);
      await pump(tester);

      expect(find.text(en.screenSharePreview), findsOneWidget);
      expect(find.text(en.screenShareCaptureFailed), findsOneWidget);
      expect(
        find.widgetWithText(AppButton, en.screenShareRetry),
        findsOneWidget,
      );
      final start = tester.widget<AppButton>(
        find.widgetWithText(AppButton, en.screenShareStart),
      );
      expect(start.onPressed, isNull);
    });

    testWidgets('offers the audio toggle below the preview', (tester) async {
      if (!nativePicker) return;
      mockCapturer(const []);
      await pump(tester);

      expect(find.byType(Checkbox), findsOneWidget);
      expect(find.text(en.screenShareIncludeSystemAudio), findsOneWidget);
    });
  });

  group('custom picker session', () {
    // These only run where the OS has no picker of its own.
    testWidgets('says no screens were detected', (tester) async {
      mockCapturer(const []);
      await pump(tester);

      if (nativePicker) return;

      expect(find.text(en.screenShareNoScreensDetected), findsOneWidget);
    });

    testWidgets('says no windows were detected after switching type', (
      tester,
    ) async {
      mockCapturer(const []);
      await pump(tester);
      if (nativePicker) return;

      await tester.tap(find.text(en.screenShareWindow));
      await tester.pumpAndSettle();

      expect(find.text(en.screenShareNoWindowsDetected), findsOneWidget);
    });

    testWidgets('a platform failure is handled like an empty list', (
      tester,
    ) async {
      mockCapturer(null);
      await pump(tester);
      if (nativePicker) return;

      expect(find.text(en.screenShareNoScreensDetected), findsOneWidget);
    });

    testWidgets('lists each source by name', (tester) async {
      mockCapturer([source('s1', 'Screen 1'), source('s2', 'Screen 2')]);
      await pump(tester);
      if (nativePicker) return;

      expect(find.text('Screen 1'), findsOneWidget);
      expect(find.text('Screen 2'), findsOneWidget);
    });

    testWidgets('renders a thumbnail image per source', (tester) async {
      mockCapturer([source('s1', 'Screen 1')]);
      await pump(tester);
      if (nativePicker) return;

      expect(find.byType(Image), findsOneWidget);
    });

    testWidgets('requests the screen source type first', (tester) async {
      mockCapturer([source('s1', 'Screen 1')]);
      await pump(tester);
      if (nativePicker) return;

      expect(requestedTypes.first, ['screen']);
    });

    testWidgets('requests the window source type after switching', (
      tester,
    ) async {
      mockCapturer([source('s1', 'Window 1')]);
      await pump(tester);
      if (nativePicker) return;

      await tester.tap(find.text(en.screenShareWindow));
      await tester.pumpAndSettle();

      expect(requestedTypes.last, ['window']);
    });

    testWidgets('tapping the already selected segment does not reload', (
      tester,
    ) async {
      mockCapturer([source('s1', 'Screen 1')]);
      await pump(tester);
      if (nativePicker) return;
      final before = requestedTypes.length;

      await tester.tap(find.text(en.screenShareEntireScreen));
      await tester.pumpAndSettle();

      expect(requestedTypes, hasLength(before));
    });

    testWidgets('switching to window hides the system audio toggle', (
      tester,
    ) async {
      mockCapturer([source('s1', 'Screen 1')]);
      await pump(tester);
      if (nativePicker) return;
      expect(find.byType(Checkbox), findsOneWidget);

      await tester.tap(find.text(en.screenShareWindow));
      await tester.pumpAndSettle();

      expect(find.byType(Checkbox), findsNothing);
    });

    testWidgets('switching back to screen restores the audio toggle', (
      tester,
    ) async {
      mockCapturer([source('s1', 'Screen 1')]);
      await pump(tester);
      if (nativePicker) return;

      await tester.tap(find.text(en.screenShareWindow));
      await tester.pumpAndSettle();
      await tester.tap(find.text(en.screenShareEntireScreen));
      await tester.pumpAndSettle();

      expect(find.byType(Checkbox), findsOneWidget);
    });

    testWidgets('switching to window resets a checked audio box', (
      tester,
    ) async {
      mockCapturer([source('s1', 'Screen 1')]);
      await pump(tester);
      if (nativePicker) return;
      await tester.tap(find.byType(Checkbox));
      await tester.pump();
      expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, isTrue);

      await tester.tap(find.text(en.screenShareWindow));
      await tester.pumpAndSettle();
      await tester.tap(find.text(en.screenShareEntireScreen));
      await tester.pumpAndSettle();

      expect(tester.widget<Checkbox>(find.byType(Checkbox)).value, isFalse);
    });

    testWidgets('start is enabled once a source is selected', (tester) async {
      mockCapturer([source('s1', 'Screen 1')]);
      await pump(tester);
      if (nativePicker) return;

      final start = tester.widget<AppButton>(
        find.widgetWithText(AppButton, en.screenShareStart),
      );
      expect(start.onPressed, isNotNull);
    });

    testWidgets('start stays disabled with no sources', (tester) async {
      mockCapturer(const []);
      await pump(tester);
      if (nativePicker) return;

      final start = tester.widget<AppButton>(
        find.widgetWithText(AppButton, en.screenShareStart),
      );
      expect(start.onPressed, isNull);
    });
  });

  group('ScreenShareSetupResult', () {
    test('carries the source, type, audio flag and config', () {
      const result = ScreenShareSetupResult(
        type: ScreenShareType.window,
        includeAudio: true,
        config: ScreenShareConfig(),
      );

      expect(result.source, isNull);
      expect(result.type, ScreenShareType.window);
      expect(result.includeAudio, isTrue);
      expect(result.previewVideoTrack, isNull);
      expect(result.previewAudioTracks, isEmpty);
    });
  });

  group('ScreenShareQualityFields', () {
    Future<void> pumpFields(
      WidgetTester tester, {
      required ScreenShareConfig config,
    }) async {
      await tester.pumpWidget(
        MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: ScreenShareQualityFields(
              mode: config.mode,
              customQuality: config.customQuality,
              customFps: config.customFps,
              onModeChanged: (_) {},
              onQualityChanged: (_) {},
              onFpsChanged: (_) {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('fluid mode shows only the mode selector', (tester) async {
      await pumpFields(tester, config: const ScreenShareConfig());

      expect(find.text(en.settingsItemShareQualityTitle), findsOneWidget);
      expect(
        find.text(en.settingsOptionShareQualityFluid60Label),
        findsOneWidget,
      );
      expect(find.text(en.settingsItemShareCustomQualityTitle), findsNothing);
      expect(find.text(en.settingsItemShareCustomFpsTitle), findsNothing);
    });

    testWidgets('custom mode reveals quality and fps selectors', (
      tester,
    ) async {
      await pumpFields(
        tester,
        config: const ScreenShareConfig(
          mode: 'custom',
          customQuality: '480p',
          customFps: '15',
        ),
      );

      expect(find.text(en.settingsItemShareCustomQualityTitle), findsOneWidget);
      expect(find.text(en.settingsItemShareCustomFpsTitle), findsOneWidget);
      expect(find.text(en.settingsOptionVideoQuality480pLabel), findsOneWidget);
      expect(find.text('15 FPS'), findsOneWidget);
    });
  });
}
