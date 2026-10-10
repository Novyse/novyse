import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/bottom_bar/chat_bottom_bar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/no_write_bottom_bar.dart';

void main() {
  testWidgets('ChatBottomBar shows NoWriteBottomBar when readOnly', (
    tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          localizationsDelegates: localizationsDelegates,
          supportedLocales: supportedLocales,
          locale: Locale('en'),
          home: Scaffold(
            body: ChatBottomBar(chatUUID: 'chat-1', readOnly: true),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(NoWriteBottomBar), findsOneWidget);
    expect(find.text('Mute notifications'), findsOneWidget);
  });
}
