import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/settings/settings_color_row.dart';

void main() {
  testWidgets('shows not-set text when value is null', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SettingsColorRow(
            title: 'Name color',
            notSetLabel: 'Not set',
          ),
        ),
      ),
    );

    expect(find.text('Not set'), findsOneWidget);
    expect(find.byType(IconButton), findsNothing);
  });

  testWidgets('hides not-set text and shows clear when a value is set', (
    tester,
  ) async {
    var cleared = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SettingsColorRow(
            title: 'Name color',
            value: const LinearGradient(
              colors: [Color(0xFFFF0000), Color(0xFF0000FF)],
            ),
            notSetLabel: 'Not set',
            clearTooltip: 'Remove',
            onCleared: () => cleared = true,
          ),
        ),
      ),
    );

    expect(find.text('Not set'), findsNothing);
    expect(find.byType(IconButton), findsOneWidget);

    await tester.tap(find.byType(IconButton));
    await tester.pump();
    expect(cleared, isTrue);
  });
}
