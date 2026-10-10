import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/copy_text_field.dart';
import 'package:novyse/ui/components/huge_icon.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('copies its value and briefly changes the icon to a checkmark', (
    tester,
  ) async {
    String? copiedValue;
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, (call) async {
          if (call.method == 'Clipboard.setData') {
            copiedValue = (call.arguments as Map)['text'] as String;
          }
          return null;
        });
    addTearDown(
      () => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(SystemChannels.platform, null),
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: CopyTextField(
            value: 'secret-api-key',
            copyTooltip: 'Copy key',
            copiedTooltip: 'Copied',
            copiedDuration: Duration(seconds: 1),
          ),
        ),
      ),
    );

    expect(find.text('secret-api-key'), findsOneWidget);
    expect(find.byTooltip('Copy key'), findsOneWidget);
    await tester.tap(find.byTooltip('Copy key'));
    await tester.pump();

    expect(copiedValue, 'secret-api-key');
    expect(find.byTooltip('Copied'), findsOneWidget);
    final copiedIcon = tester.widget<AppHugeIcon>(find.byType(AppHugeIcon));
    expect(copiedIcon.icon, HugeIcons.strokeRoundedCheckmarkCircle02);

    await tester.pump(const Duration(seconds: 1));
    expect(find.byTooltip('Copy key'), findsOneWidget);
  });
}
