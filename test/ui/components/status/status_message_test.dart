import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/status/status_message.dart';

void main() {
  testWidgets('StatusMessage renders success type with title and content', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: StatusMessage(
            type: StatusMessageType.success,
            title: 'Success',
            content: ['Registration completed successfully!'],
          ),
        ),
      ),
    );

    expect(find.text('Success'), findsOneWidget);
    expect(find.text('Registration completed successfully!'), findsOneWidget);
  });

  testWidgets('StatusMessage renders danger type and handles dismiss', (
    WidgetTester tester,
  ) async {
    bool closed = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: StatusMessage(
            type: StatusMessageType.danger,
            title: 'Error',
            content: ['Something went wrong'],
            onClose: () => closed = true,
          ),
        ),
      ),
    );

    expect(find.text('Error'), findsOneWidget);
    expect(find.text('Something went wrong'), findsOneWidget);

    // Tap close button
    await tester.tap(find.byType(InkWell));
    await tester.pump();

    expect(closed, isTrue);
  });
}
