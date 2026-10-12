import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/pages/update_required.dart';

void main() {
  Widget buildTestWidget({String? minVersion}) {
    return MaterialApp(
      localizationsDelegates: localizationsDelegates,
      supportedLocales: supportedLocales,
      locale: const Locale('en'),
      home: UpdateRequiredPage(minVersion: minVersion),
    );
  }

  testWidgets('UpdateRequiredPage renders title, subtitle, and versions', (
    tester,
  ) async {
    await tester.pumpWidget(buildTestWidget(minVersion: '2.0.0'));
    await tester.pumpAndSettle();

    expect(find.text('Update Required'), findsOneWidget);
    expect(
      find.text(
        'A new version of Novyse is available and required to continue.\n\nPlease update to access the latest features and security improvements.',
      ),
      findsOneWidget,
    );
    expect(find.text('Required: 2.0.0'), findsOneWidget);
    expect(find.text('Update Now'), findsOneWidget);
    expect(find.text('Download from Website'), findsOneWidget);
  });

  testWidgets('UpdateRequiredPage renders fallback button on mobile', (
    tester,
  ) async {
    debugOverridePlatform = AppPlatform.mobile;
    addTearDown(() => debugOverridePlatform = null);

    await tester.pumpWidget(buildTestWidget(minVersion: '2.0.0'));
    await tester.pumpAndSettle();

    expect(find.text('Update Now'), findsNothing);
    expect(find.text('Download from Website'), findsOneWidget);
  });

  testWidgets('UpdateRequiredPage renders store guidance for Flathub install', (
    tester,
  ) async {
    debugOverrideInstallSource = AppInstallSource.flathub;
    addTearDown(() => debugOverrideInstallSource = null);

    await tester.pumpWidget(buildTestWidget(minVersion: '2.0.0'));
    await tester.pumpAndSettle();

    expect(
      find.text('This install is managed by Flathub. Update it through that store.'),
      findsOneWidget,
    );
    expect(find.text('Update Now'), findsNothing);
    expect(find.text('Open Flathub'), findsOneWidget);
  });

  testWidgets('UpdateRequiredPage renders store guidance for Snap install', (
    tester,
  ) async {
    debugOverrideInstallSource = AppInstallSource.snapStore;
    addTearDown(() => debugOverrideInstallSource = null);

    await tester.pumpWidget(buildTestWidget(minVersion: '2.0.0'));
    await tester.pumpAndSettle();

    expect(
      find.text('This install is managed by Snap Store. Update it through that store.'),
      findsOneWidget,
    );
    expect(find.text('Update Now'), findsNothing);
    expect(find.text('Open Snap Store'), findsOneWidget);
  });
}
