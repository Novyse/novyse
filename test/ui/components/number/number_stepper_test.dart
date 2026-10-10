import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/number/number_stepper.dart';

void main() {
  final decrement = find.byKey(const ValueKey('number_stepper_decrement'));
  final increment = find.byKey(const ValueKey('number_stepper_increment'));
  final valueText = find.byKey(const ValueKey('number_stepper_value'));

  Future<void> pump(
    WidgetTester tester, {
    required double value,
    double step = 1,
    double min = 0,
    double max = 10,
    int fractionDigits = 0,
    ValueChanged<double>? onChanged,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: NumberStepper(
            value: value,
            step: step,
            min: min,
            max: max,
            fractionDigits: fractionDigits,
            onChanged: onChanged ?? (_) {},
          ),
        ),
      ),
    );
  }

  testWidgets('shows the value with buttons on each side', (tester) async {
    await pump(tester, value: 5);

    expect(tester.widget<Text>(valueText).data, '5');
    expect(decrement, findsOneWidget);
    expect(increment, findsOneWidget);
  });

  testWidgets('plus emits value plus the configured step', (tester) async {
    final values = <double>[];
    await pump(tester, value: 5, step: 2, max: 20, onChanged: values.add);

    await tester.tap(increment);
    expect(values, [7]);
  });

  testWidgets('minus emits value minus the configured step', (tester) async {
    final values = <double>[];
    await pump(tester, value: 5, step: 2, max: 20, onChanged: values.add);

    await tester.tap(decrement);
    expect(values, [3]);
  });

  testWidgets('disables minus at min and plus at max', (tester) async {
    await pump(tester, value: 0, min: 0, max: 10);
    expect(tester.widget<IconButton>(decrement).onPressed, isNull);
    expect(tester.widget<IconButton>(increment).onPressed, isNotNull);

    await pump(tester, value: 10, min: 0, max: 10);
    expect(tester.widget<IconButton>(decrement).onPressed, isNotNull);
    expect(tester.widget<IconButton>(increment).onPressed, isNull);
  });

  testWidgets('holding plus jumps straight to max', (tester) async {
    final values = <double>[];
    await pump(
      tester,
      value: 2,
      step: 1,
      min: 0,
      max: 10,
      onChanged: values.add,
    );

    await tester.longPress(increment);
    expect(values, [10]);
  });

  testWidgets('holding minus jumps straight to min', (tester) async {
    final values = <double>[];
    await pump(
      tester,
      value: 2,
      step: 1,
      min: 0,
      max: 10,
      onChanged: values.add,
    );

    await tester.longPress(decrement);
    expect(values, [0]);
  });

  testWidgets('holding minus does nothing when already at min', (tester) async {
    final values = <double>[];
    await pump(
      tester,
      value: 0,
      step: 1,
      min: 0,
      max: 10,
      onChanged: values.add,
    );

    await tester.longPress(decrement);
    expect(values, isEmpty);
  });

  testWidgets('holding plus does nothing when already at max', (tester) async {
    final values = <double>[];
    await pump(
      tester,
      value: 10,
      step: 1,
      min: 0,
      max: 10,
      onChanged: values.add,
    );

    await tester.longPress(increment);
    expect(values, isEmpty);
  });

  testWidgets('clamps a step that would pass the bounds', (tester) async {
    final values = <double>[];
    await pump(tester, value: 9, step: 5, max: 10, onChanged: values.add);

    await tester.tap(increment);
    expect(values, [10]);
  });

  testWidgets('supports decimal values', (tester) async {
    final values = <double>[];
    await pump(
      tester,
      value: 0.5,
      step: 0.25,
      min: 0,
      max: 1,
      fractionDigits: 2,
      onChanged: values.add,
    );

    expect(tester.widget<Text>(valueText).data, '0.50');
    await tester.tap(increment);
    expect(values, [0.75]);
  });

  testWidgets('value is red when out of range', (tester) async {
    await pump(tester, value: 11, min: 0, max: 10);
    final color = tester.widget<Text>(valueText).style?.color;
    expect(color, Theme.of(tester.element(valueText)).colorScheme.error);
  });

  testWidgets('value uses the normal colour when in range', (tester) async {
    await pump(tester, value: 5, min: 0, max: 10);
    final color = tester.widget<Text>(valueText).style?.color;
    expect(color, Theme.of(tester.element(valueText)).colorScheme.onSurface);
  });
}
