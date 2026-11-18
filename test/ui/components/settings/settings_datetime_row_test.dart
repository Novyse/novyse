import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/datetime/datetime_picker.dart';
import 'package:novyse/ui/components/settings/settings_datetime_row.dart';

void main() {
  test('formatSettingsDatetime matches the picker mode', () {
    final value = DateTime(1990, 4, 1, 15, 7);
    expect(
      formatSettingsDatetime(value, DatetimePickerMode.date),
      '01/04/1990',
    );
    expect(
      formatSettingsDatetime(value, DatetimePickerMode.time),
      '15:07',
    );
    expect(
      formatSettingsDatetime(value, DatetimePickerMode.dateTime),
      '01/04/1990 · 15:07',
    );
  });

  testWidgets('shows not-set text when value is null', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SettingsDatetimeRow(
            title: 'Birthday',
            mode: DatetimePickerMode.date,
            notSetLabel: 'Not set',
          ),
        ),
      ),
    );

    expect(find.text('Not set'), findsOneWidget);
    expect(find.byType(IconButton), findsNothing);
  });

  testWidgets('shows formatted value and clear button when set', (
    tester,
  ) async {
    var cleared = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SettingsDatetimeRow(
            title: 'Birthday',
            mode: DatetimePickerMode.date,
            value: DateTime(1990, 4, 1),
            notSetLabel: 'Not set',
            clearTooltip: 'Remove',
            onCleared: () => cleared = true,
          ),
        ),
      ),
    );

    expect(find.text('01/04/1990'), findsOneWidget);
    expect(find.byType(IconButton), findsOneWidget);

    await tester.tap(find.byType(IconButton));
    await tester.pump();
    expect(cleared, isTrue);
  });
}
