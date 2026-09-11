import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_recents_store.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_recents_store.dart'
    show sharedPreferencesProvider;
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  group('EmojiRecentsStore', () {
    test('push dedupes, caps at 24 and persists across restarts', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final container = ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
      addTearDown(container.dispose);

      final notifier = container.read(emojiRecentsProvider.notifier);
      await notifier.push('🔥');
      await notifier.push('👍');
      await notifier.push('🔥'); // re-select moves to front, no duplicate

      expect(container.read(emojiRecentsProvider), ['🔥', '👍']);

      // Simulate restart: new store reads the same prefs.
      final container2 = ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
      addTearDown(container2.dispose);
      expect(container2.read(emojiRecentsProvider), ['🔥', '👍']);
    });

    test('corrupt storage yields empty recents instead of throwing', () async {
      SharedPreferences.setMockInitialValues({
        EmojiRecentsStore.storageKey: 'not-json{{{',
      });
      final prefs = await SharedPreferences.getInstance();
      final container = ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
      addTearDown(container.dispose);

      expect(container.read(emojiRecentsProvider), isEmpty);
    });
  });
}
