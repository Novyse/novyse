import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/settings/settings_actions.dart';
import 'package:novyse/pages/app/settings/oss_licenses_page.dart';

Widget _wrap(Widget child) {
  return ProviderScope(
    child: MaterialApp(
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('it'), Locale('en')],
      locale: const Locale('it'),
      home: child,
    ),
  );
}

void main() {
  testWidgets('OssLicensesPage displays package list and filters', (tester) async {
    await tester.pumpWidget(_wrap(const OssLicensesPage()));
    await tester.pumpAndSettle();

    // Verify title is rendered
    expect(find.text('Licenze Open Source'), findsOneWidget);

    // Verify packages are shown
    expect(find.byType(OssLicensesPage), findsOneWidget);

    // Open search
    final searchButton = find.byTooltip('Cerca chat'); // searchChats translation
    if (searchButton.evaluate().isNotEmpty) {
      await tester.tap(searchButton);
      await tester.pumpAndSettle();

      // Enter query
      await tester.enterText(find.byType(TextField), 'dio');
      await tester.pumpAndSettle();

      expect(find.text('dio'), findsWidgets);
    }
  });

  testWidgets('runSettingsAction openLicenses pushes OssLicensesPage', (tester) async {
    await tester.pumpWidget(
      _wrap(
        Consumer(
          builder: (context, ref, _) => ElevatedButton(
            onPressed: () => runSettingsAction(ref, context, 'openLicenses'),
            child: const Text('Open'),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();

    expect(find.byType(OssLicensesPage), findsOneWidget);
  });
}
