import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/chat/message/message_file.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('MessageFileAttachment Widget Tests', () {
    testWidgets('renders MessageFileAttachment with name, size, and icon', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageFileAttachment(
              fileRef: 'file:///local/document.pdf',
              uuid: '',
              name: 'document.pdf',
              mimeType: 'application/pdf',
              size: 1048576,
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('document.pdf'), findsOneWidget);
      expect(find.text('1.00 MB'), findsOneWidget);
      expect(find.byType(MessageFileAttachment), findsOneWidget);
    });

    testWidgets('tap open action does not throw when unresolvable', (
      tester,
    ) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageFileAttachment(
              fileRef: null,
              uuid: '',
              name: 'archive.zip',
              mimeType: 'application/zip',
              size: 512,
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.byType(MessageFileAttachment));
      await tester.pump();

      expect(tester.takeException(), isNull);
    });

    testWidgets('renders pending state spinner when pending', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: MessageFileAttachment(
              fileRef: null,
              uuid: '',
              name: 'uploading.docx',
              mimeType: 'application/msword',
              isPending: true,
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });
  });
}
