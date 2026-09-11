import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_category.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_repository.dart';

void main() {
  group('EmojiRepository', () {
    test('all loads a non-empty sorted list without obsoleted entries', () {
      expect(EmojiRepository.all, isNotEmpty);
      expect(
        EmojiRepository.all.any((e) => e.obsoletedBy != null),
        isFalse,
      );
      final orders = EmojiRepository.all.map((e) => e.sortOrder).toList();
      final sorted = List<int>.from(orders)..sort();
      expect(orders, sorted);
    });

    test('buildSections without recents yields the nine legacy categories',
        () {
      final sections = EmojiRepository.buildSections(const []);
      expect(
        sections.map((s) => s.category),
        [
          EmojiCategory.smileys,
          EmojiCategory.people,
          EmojiCategory.animals,
          EmojiCategory.food,
          EmojiCategory.travel,
          EmojiCategory.activities,
          EmojiCategory.objects,
          EmojiCategory.symbols,
          EmojiCategory.flags,
        ],
      );
      for (final s in sections) {
        expect(s.emojis, isNotEmpty);
      }
    });

    test('buildSections puts known recents first and drops unknown chars',
        () {
      final sections = EmojiRepository.buildSections(const ['🔥', '???']);
      expect(sections.first.category, EmojiCategory.recents);
      expect(sections.first.emojis.map((e) => e.emoji), ['🔥']);
      expect(sections.length, 10);
    });

    test('search finds by name, short name and ascii, case-insensitively',
        () {
      final tada = EmojiRepository.search('tada');
      expect(tada.map((e) => e.emoji), contains('🎉'));

      final wink = EmojiRepository.search(';)');
      expect(wink.map((e) => e.emoji), contains('😉'));

      final upper = EmojiRepository.search('TADA');
      expect(upper.map((e) => e.emoji), contains('🎉'));
    });

    test('search returns empty for blank query and unknown terms', () {
      expect(EmojiRepository.search(''), isEmpty);
      expect(EmojiRepository.search('   '), isEmpty);
      expect(EmojiRepository.search('zzz-no-such-emoji'), isEmpty);
    });

    test('byChar resolves base glyphs and skin-tone variants', () {
      expect(EmojiRepository.byChar['🔥']?.emoji, '🔥');
      // 👋 base plus light-skin variant from the same entry.
      expect(EmojiRepository.byChar['👋'], isNotNull);
      expect(EmojiRepository.byChar['👋🏻'], isNotNull);
    });
  });
}
