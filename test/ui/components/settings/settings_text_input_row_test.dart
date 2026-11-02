import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/settings/settings_text_input_row.dart';

Widget _wrap(Widget child) {
  return MaterialApp(home: Scaffold(body: child));
}

void main() {
  testWidgets('shows title, initial value and placeholder', (tester) async {
    await tester.pumpWidget(
      _wrap(
        const SettingsTextInputRow(
          title: 'Nome',
          initialValue: 'Ada',
          hintText: 'Inserisci il tuo nome',
        ),
      ),
    );

    expect(find.text('Nome'), findsOneWidget);
    expect(find.text('Ada'), findsOneWidget);
    expect(find.text('Inserisci il tuo nome'), findsOneWidget);
  });

  testWidgets('reports edits through onChanged', (tester) async {
    var seen = '';
    await tester.pumpWidget(
      _wrap(SettingsTextInputRow(title: 'Nome', onChanged: (v) => seen = v)),
    );

    await tester.enterText(find.byType(TextField), 'Grace');
    expect(seen, 'Grace');
  });

  testWidgets('a multi-line row defaults maxLines to minLines', (
    tester,
  ) async {
    await tester.pumpWidget(
      _wrap(const SettingsTextInputRow(title: 'Bio', minLines: 4)),
    );

    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.minLines, 4);
    expect(field.maxLines, 4);
  });

  testWidgets('a single-line row stays single-line', (tester) async {
    await tester.pumpWidget(_wrap(const SettingsTextInputRow(title: 'Nome')));

    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.minLines, 1);
    expect(field.maxLines, 1);
  });

  testWidgets('late initial values fill an untouched field', (tester) async {
    await tester.pumpWidget(
      _wrap(const SettingsTextInputRow(title: 'Nome', initialValue: '')),
    );
    expect(find.text('Ada'), findsNothing);

    await tester.pumpWidget(
      _wrap(const SettingsTextInputRow(title: 'Nome', initialValue: 'Ada')),
    );
    await tester.pump();

    expect(find.text('Ada'), findsOneWidget);
  });

  testWidgets('late initial values never clobber a user edit', (tester) async {
    await tester.pumpWidget(
      _wrap(const SettingsTextInputRow(title: 'Nome', initialValue: '')),
    );
    await tester.enterText(find.byType(TextField), 'Grace');

    await tester.pumpWidget(
      _wrap(const SettingsTextInputRow(title: 'Nome', initialValue: 'Ada')),
    );
    await tester.pump();

    expect(find.text('Grace'), findsOneWidget);
    expect(find.text('Ada'), findsNothing);
  });
}
