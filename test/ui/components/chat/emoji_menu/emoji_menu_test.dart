import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_content.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_recents_store.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_section_list.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji_menu_overlay.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_picker.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_provider.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_recents_store.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'gif_provider_recents_test.dart' show FakeGifProvider;

const _gif = GifItem(
  id: 'g1',
  provider: 'klipy',
  url: 'https://cdn.example/g1.gif',
  previewUrl: 'https://cdn.example/g1_preview.gif',
  width: 200,
  height: 100,
);

Future<ProviderContainer> _container() async {
  SharedPreferences.setMockInitialValues({});
  final prefs = await SharedPreferences.getInstance();
  final container = ProviderContainer(
    overrides: [
      sharedPreferencesProvider.overrideWithValue(prefs),
      gifProviderProvider.overrideWithValue(
        FakeGifProvider(items: [_gif], providers: const ['klipy']),
      ),
    ],
  );
  return container;
}

Widget _app(ProviderContainer container, Widget child) {
  return UncontrolledProviderScope(
    container: container,
    child: MaterialApp(
      localizationsDelegates: localizationsDelegates,
      supportedLocales: supportedLocales,
      locale: const Locale('en'),
      home: Scaffold(body: child),
    ),
  );
}

Widget _sized(Widget child) =>
    SizedBox(height: 400, child: child);

void main() {
  group('EmojiMenuPanel', () {
    testWidgets('switches between Emoji / Sticker WIP / GIF tabs', (
      tester,
    ) async {
      final container = await _container();
      addTearDown(container.dispose);

      GifItem? selected;
      await tester.pumpWidget(
        _app(
          container,
          EmojiMenuPanel(onSelectGif: (g) => selected = g),
        ),
      );
      await tester.pumpAndSettle();

      // Emoji tab shows the custom single list with search + categories.
      expect(find.text('Smileys & Emotion'), findsWidgets);
      expect(find.byType(EmojiSectionList), findsOneWidget);

      // Sticker tab shows the WIP placeholder.
      await tester.tap(find.text('Sticker').first);
      await tester.pumpAndSettle();
      expect(find.textContaining('Stickers'), findsOneWidget);
      expect(selected, isNull);

      // GIF tab shows search + provider filter + results.
      // Fixed pumps: CachedNetworkImage never settles in widget tests
      // (HTTP 400 stub), so pumpAndSettle would time out here.
      await tester.tap(find.text('GIF').first);
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.byType(GifPicker), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);
      expect(find.text('All'), findsOneWidget);
      expect(find.text('Klipy'), findsOneWidget);
    });

    testWidgets('quick EmojiContent renders 3 emojis + expand', (tester) async {
      final container = await _container();
      addTearDown(container.dispose);

      String? picked;
      var expanded = false;
      await tester.pumpWidget(
        _app(
          container,
          EmojiContent(
            mode: EmojiContentMode.quick,
            onEmojiSelected: (e) => picked = e,
            onExpandMenu: () => expanded = true,
          ),
        ),
      );

      expect(find.text('❤️'), findsOneWidget);
      expect(find.text('👍'), findsOneWidget);
      expect(find.text('🔥'), findsOneWidget);

      await tester.tap(find.text('👍'));
      expect(picked, '👍');

      await tester.tap(find.byIcon(Icons.expand_more));
      expect(expanded, isTrue);
    });
  });

  group('EmojiSectionList', () {
    testWidgets('category toolbar jumps to the tapped section', (
      tester,
    ) async {
      final container = await _container();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        _app(container, _sized(EmojiSectionList(onSelect: (_) {}))),
      );
      await tester.pumpAndSettle();

      await tester.tap(
        find.byWidgetPredicate(
          (w) =>
              w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedFlag02,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Flags'), findsOneWidget);
    });

    testWidgets('search filters to a single results section', (tester) async {
      final container = await _container();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        _app(container, _sized(EmojiSectionList(onSelect: (_) {}))),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'tada');
      await tester.pumpAndSettle();

      expect(find.text('Search Results'), findsOneWidget);
      expect(find.text('🎉'), findsOneWidget);
      // Category toolbar hides while searching (legacy behavior).
      expect(
        find.byWidgetPredicate(
          (w) =>
              w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedFlag02,
        ),
        findsNothing,
      );
    });

    testWidgets('tap inserts at cursor, notifies and saves recent', (
      tester,
    ) async {
      final container = await _container();
      addTearDown(container.dispose);

      final controller = TextEditingController(text: 'hi ');
      controller.selection = const TextSelection.collapsed(offset: 3);
      addTearDown(controller.dispose);

      String? picked;
      await tester.pumpWidget(
        _app(
          container,
          _sized(
            EmojiContent(
              textEditingController: controller,
              onEmojiSelected: (e) => picked = e,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'tada');
      await tester.pumpAndSettle();
      await tester.tap(find.text('🎉'));
      await tester.pumpAndSettle();

      expect(controller.text, 'hi 🎉');
      expect(picked, '🎉');
      expect(container.read(emojiRecentsProvider), ['🎉']);
    });

    testWidgets('long-press opens skin-tone variants', (tester) async {
      final container = await _container();
      addTearDown(container.dispose);

      String? picked;
      await tester.pumpWidget(
        _app(
          container,
          _sized(EmojiSectionList(onSelect: (e) => picked = e)),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'waving hand');
      await tester.pumpAndSettle();

      await tester.longPress(find.text('👋'));
      await tester.pumpAndSettle();

      expect(find.text('👋🏻'), findsOneWidget);
      expect(picked, isNull);

      await tester.tap(find.text('👋🏻'));
      await tester.pumpAndSettle();
      expect(picked, '👋🏻');
    });
  });
}
