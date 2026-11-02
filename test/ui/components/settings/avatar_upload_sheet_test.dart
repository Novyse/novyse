import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_catalog.dart';
import 'package:novyse/core/storage/file/file_handler.dart';
import 'package:novyse/ui/components/image_crop/image_crop.dart';
import 'package:novyse/ui/components/settings/avatar_upload_sheet.dart';
import 'package:novyse/ui/components/settings/settings_item_renderer.dart';

void main() {
  SettingItem item(String id) {
    final page = SettingsCatalog.findCategory('account')!.pages.single;
    return page.groups.single.items.firstWhere((entry) => entry.id == id);
  }

  Widget app(Widget home) {
    return ProviderScope(
      child: MaterialApp(
        localizationsDelegates: localizationsDelegates,
        supportedLocales: supportedLocales,
        locale: const Locale('en'),
        home: home,
      ),
    );
  }

  testWidgets('avatar row opens the upload sheet and banner stays inactive', (
    tester,
  ) async {
    await tester.pumpWidget(
      app(
        Scaffold(
          body: Column(
            children: [
              SettingsItemRenderer(item: item('avatar')),
              SettingsItemRenderer(item: item('profile_banner')),
            ],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Avatar'), findsOneWidget);
    expect(find.text('Profile Banner'), findsOneWidget);

    final bannerIgnore = tester.widget<IgnorePointer>(
      find
          .ancestor(
            of: find.text('Profile Banner'),
            matching: find.byType(IgnorePointer),
          )
          .first,
    );
    expect(bannerIgnore.ignoring, isTrue);

    await tester.tap(find.text('Avatar'));
    await tester.pumpAndSettle();

    expect(find.text('Change avatar'), findsOneWidget);
    expect(find.text('Choose image'), findsOneWidget);
    expect(find.text('Upload'), findsOneWidget);
  });

  testWidgets('choosing one image enables upload and closes the sheet', (
    tester,
  ) async {
    PickedFileAsset? uploaded;
    final png = await _widePng(tester);
    final image = PickedFileAsset(
      name: 'face.png',
      size: png.length,
      bytes: png,
      extension: 'png',
    );

    await tester.pumpWidget(
      app(
        Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => showAvatarUploadSheet(
                context,
                pickImage: () async => image,
                uploadImage: (asset) async {
                  uploaded = asset;
                  return true;
                },
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Choose image'));
    await tester.pump();
    await tester.runAsync(_flushImages);
    await tester.pump();

    expect(find.text('face.png'), findsOneWidget);
    expect(find.byType(ImageCropGuide), findsOneWidget);
    expect(find.textContaining('Drag to move the guide'), findsOneWidget);

    await tester.ensureVisible(find.text('Upload'));
    await tester.tap(find.text('Upload'));
    await tester.pump();
    await tester.runAsync(_flushImages);
    await tester.pump();
    await tester.runAsync(_flushImages);
    await tester.pump();

    expect(uploaded?.name, 'face.png');
    final cropped = uploaded?.bytes;
    expect(cropped, isNotNull);
    final frame = await tester.runAsync(() async {
      final codec = await ui.instantiateImageCodec(
        Uint8List.fromList(cropped!),
      );
      final next = await codec.getNextFrame();
      codec.dispose();
      return next;
    });
    expect(frame!.image.width, frame.image.height);
    frame.image.dispose();
  });

  testWidgets('a file past the size limit cannot be uploaded', (tester) async {
    var uploads = 0;
    final image = PickedFileAsset(
      name: 'huge.png',
      size: ProfilePictureLimit.size + 1,
      extension: 'png',
    );

    await tester.pumpWidget(
      app(
        Builder(
          builder: (context) => Scaffold(
            body: TextButton(
              onPressed: () => showAvatarUploadSheet(
                context,
                pickImage: () async => image,
                uploadImage: (asset) async {
                  uploads++;
                  return true;
                },
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Choose image'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Upload'));
    await tester.pumpAndSettle();

    expect(uploads, 0);
    expect(find.text('Change avatar'), findsOneWidget);
    expect(find.textContaining('Maximum allowed'), findsOneWidget);
  });
}

/// Keeps the test from importing the service just for the byte ceiling.
abstract final class ProfilePictureLimit {
  static const int size = 50 * 1024 * 1024;
}

/// Image codecs complete outside the test's fake async zone.
Future<void> _flushImages() {
  return Future<void>.delayed(const Duration(milliseconds: 200));
}

/// 8×4 image so the circular guide must cut a centered square.
Future<Uint8List> _widePng(WidgetTester tester) async {
  final bytes = await tester.runAsync(() async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.drawRect(
      const Rect.fromLTWH(0, 0, 4, 4),
      Paint()..color = const Color(0xFFFF0000),
    );
    canvas.drawRect(
      const Rect.fromLTWH(4, 0, 4, 4),
      Paint()..color = const Color(0xFF0000FF),
    );
    final image = await recorder.endRecording().toImage(8, 4);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    return data!.buffer.asUint8List();
  });
  return bytes!;
}
