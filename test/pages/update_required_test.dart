import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/updater/self_update_capability.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/pages/update_required.dart';
import 'package:novyse/pages/update_required/install_source_guidance.dart';

void main() {
  Widget buildTestWidget({String? minVersion}) {
    return MaterialApp(
      localizationsDelegates: localizationsDelegates,
      supportedLocales: supportedLocales,
      locale: const Locale('en'),
      home: UpdateRequiredPage(minVersion: minVersion),
    );
  }

  Future<void> pumpGuidance(
    WidgetTester tester, {
    AppOS? os,
    AppInstallSource? source,
    InstallGuidance? guidance,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: localizationsDelegates,
        supportedLocales: supportedLocales,
        locale: const Locale('en'),
        home: Scaffold(
          body: InstallSourceGuidance(
            testOs: os,
            testSource: source,
            testGuidance: guidance,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('UpdateRequiredPage renders title, subtitle, and versions', (
    tester,
  ) async {
    debugOverridePlatform = AppPlatform.desktop;
    debugOverrideInstallSource = AppInstallSource.direct;
    debugOverrideCanSelfUpdate = true;
    addTearDown(() {
      debugOverridePlatform = null;
      debugOverrideInstallSource = null;
      debugOverrideCanSelfUpdate = null;
    });

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

  testWidgets(
    'UpdateRequiredPage renders fallback button for system package install (RPM / DEB)',
    (tester) async {
      debugOverridePlatform = AppPlatform.desktop;
      debugOverrideInstallSource = AppInstallSource.systemPackage;
      addTearDown(() {
        debugOverridePlatform = null;
        debugOverrideInstallSource = null;
      });

      await tester.pumpWidget(buildTestWidget(minVersion: '2.0.0'));
      await tester.pumpAndSettle();

      expect(find.text('Update Now'), findsNothing);
      expect(find.text('Download from Website'), findsOneWidget);
      // Exact banner depends on the host distro; every Linux manual
      // banner points at the website.
      expect(find.textContaining('website'), findsWidgets);
    },
  );

  testWidgets(
    'UpdateRequiredPage hides Update Now when self-update capability check fails',
    (tester) async {
      debugOverridePlatform = AppPlatform.desktop;
      debugOverrideInstallSource = AppInstallSource.direct;
      debugOverrideCanSelfUpdate = false;
      addTearDown(() {
        debugOverridePlatform = null;
        debugOverrideInstallSource = null;
        debugOverrideCanSelfUpdate = null;
      });

      await tester.pumpWidget(buildTestWidget(minVersion: '2.0.0'));
      await tester.pumpAndSettle();

      expect(find.text('Update Now'), findsNothing);
      expect(find.text('Download from Website'), findsOneWidget);
    },
  );

  testWidgets(
    'UpdateRequiredPage renders Update Now when self-update capability check succeeds',
    (tester) async {
      debugOverridePlatform = AppPlatform.desktop;
      debugOverrideCanSelfUpdate = true;
      debugOverrideInstallSource = AppInstallSource.direct;
      addTearDown(() {
        debugOverridePlatform = null;
        debugOverrideCanSelfUpdate = null;
        debugOverrideInstallSource = null;
      });

      await tester.pumpWidget(buildTestWidget(minVersion: '2.0.0'));
      await tester.pumpAndSettle();

      expect(find.text('Update Now'), findsOneWidget);
      expect(find.text('Download from Website'), findsOneWidget);
    },
  );

  testWidgets('UpdateRequiredPage shows copyable snap refresh command', (
    tester,
  ) async {
    debugOverridePlatform = AppPlatform.desktop;
    debugOverrideInstallSource = AppInstallSource.snapStore;
    addTearDown(() {
      debugOverridePlatform = null;
      debugOverrideInstallSource = null;
    });

    await tester.pumpWidget(buildTestWidget(minVersion: '2.0.0'));
    await tester.pumpAndSettle();

    expect(find.text('sudo snap refresh novyse'), findsOneWidget);
  });

  testWidgets('UpdateRequiredPage shows copyable flatpak update command', (
    tester,
  ) async {
    debugOverridePlatform = AppPlatform.desktop;
    debugOverrideInstallSource = AppInstallSource.flathub;
    addTearDown(() {
      debugOverridePlatform = null;
      debugOverrideInstallSource = null;
    });

    await tester.pumpWidget(buildTestWidget(minVersion: '2.0.0'));
    await tester.pumpAndSettle();

    expect(find.text('flatpak update com.novyse.novyse'), findsOneWidget);
  });

  testWidgets('UpdateRequiredPage shows no guidance for direct installs', (
    tester,
  ) async {
    debugOverridePlatform = AppPlatform.desktop;
    debugOverrideCanSelfUpdate = true;
    debugOverrideInstallSource = AppInstallSource.direct;
    addTearDown(() {
      debugOverridePlatform = null;
      debugOverrideCanSelfUpdate = null;
      debugOverrideInstallSource = null;
    });

    await tester.pumpWidget(buildTestWidget(minVersion: '2.0.0'));
    await tester.pumpAndSettle();

    expect(find.text('sudo snap refresh novyse'), findsNothing);
    expect(find.text('flatpak update com.novyse.novyse'), findsNothing);
    expect(find.textContaining('system package manager'), findsNothing);
  });

  group('InstallSourceGuidance', () {
    testWidgets('renders macOS uncertified banner', (tester) async {
      await pumpGuidance(tester, guidance: InstallGuidance.macOSUncertified);

      expect(find.textContaining('not certified'), findsOneWidget);
      expect(find.text('Update Now'), findsNothing);
    });

    testWidgets('renders RPM banner', (tester) async {
      await pumpGuidance(tester, guidance: InstallGuidance.linuxRpm);

      expect(find.textContaining('.rpm'), findsOneWidget);
      expect(find.text('sudo snap refresh novyse'), findsNothing);
    });

    testWidgets('renders DEB banner', (tester) async {
      await pumpGuidance(tester, guidance: InstallGuidance.linuxDeb);

      expect(find.textContaining('.deb'), findsOneWidget);
    });

    testWidgets('renders AppImage banner', (tester) async {
      await pumpGuidance(tester, guidance: InstallGuidance.linuxAppImage);

      expect(find.textContaining('AppImage'), findsWidgets);
    });

    testWidgets('renders generic system banner', (tester) async {
      await pumpGuidance(tester, guidance: InstallGuidance.linuxSystemUnknown);

      expect(find.textContaining('system package manager'), findsOneWidget);
    });

    testWidgets('renders read-only banner', (tester) async {
      await pumpGuidance(tester, guidance: InstallGuidance.readOnlyInstall);

      expect(find.textContaining('not writable'), findsOneWidget);
    });

    testWidgets('renders snap banner with command', (tester) async {
      await pumpGuidance(
        tester,
        source: AppInstallSource.snapStore,
        guidance: InstallGuidance.snapStore,
      );

      expect(find.textContaining('Snap Store'), findsOneWidget);
      expect(find.text('sudo snap refresh novyse'), findsOneWidget);
    });

    testWidgets('renders nothing for capable installs', (tester) async {
      await pumpGuidance(tester, guidance: InstallGuidance.none);

      expect(find.byType(SelectableText), findsNothing);
      expect(find.byType(Text), findsNothing);
    });
  });
}
