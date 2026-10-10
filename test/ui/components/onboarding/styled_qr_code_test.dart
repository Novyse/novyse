import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/onboarding/styled_qr_code.dart';

void main() {
  testWidgets('StyledQrCode renders with gradient and embedded logo', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: StyledQrCode(
            data: 'test-qr-payload-data',
            size: 220,
            embeddedLogo: SizedBox(width: 40, height: 40, child: Text('Logo')),
          ),
        ),
      ),
    );

    expect(find.byType(StyledQrCode), findsOneWidget);
    expect(find.byType(CustomPaint), findsWidgets);
    expect(find.text('Logo'), findsOneWidget);
  });
}
