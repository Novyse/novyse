import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/status_store.dart';
import 'package:novyse/ui/components/status/global_status_bar.dart';

void main() {
  Widget createTestWidget(ProviderContainer container, [Locale locale = const Locale('en')]) {
    return UncontrolledProviderScope(
      container: container,
      child: MaterialApp(
        localizationsDelegates: localizationsDelegates,
        supportedLocales: supportedLocales,
        locale: locale,
        home: const Scaffold(
          body: GlobalStatusBar(),
        ),
      ),
    );
  }

  testWidgets('GlobalStatusBar renders localized status message when active', (tester) async {
    final container = ProviderContainer();

    await tester.pumpWidget(createTestWidget(container, const Locale('en')));
    expect(find.byType(GlobalStatusBar), findsOneWidget);
    // Initially empty
    expect(find.text('No Connection'), findsNothing);

    // Emit offline status
    container.read(statusProvider.notifier).setOffline(true);
    await tester.pumpAndSettle();

    expect(find.text('No Connection'), findsOneWidget);
    expect(find.text('You are offline. Waiting for network connection...'), findsOneWidget);

    // Dismiss offline status
    container.read(statusProvider.notifier).setOffline(false);
    await tester.pumpAndSettle();

    expect(find.text('No Connection'), findsNothing);

    container.dispose();
  });

  testWidgets('GlobalStatusBar renders Italian localization when locale is IT', (tester) async {
    final container = ProviderContainer();

    await tester.pumpWidget(createTestWidget(container, const Locale('it')));

    // Emit offline status
    container.read(statusProvider.notifier).setOffline(true);
    await tester.pumpAndSettle();

    expect(find.text('Nessuna Connessione'), findsOneWidget);
    expect(find.text('Sei offline. In attesa del ripristino della rete...'), findsOneWidget);

    container.dispose();
  });
}
