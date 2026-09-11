import 'package:flutter/foundation.dart';
import 'package:novyse/ui/components/chat/emoji_menu/emoji/emoji_category.dart';
import 'package:unicode_emojis/unicode_emojis.dart' as ue;

/// One visible section of the single emoji list.
@immutable
class EmojiSection {
  const EmojiSection({required this.category, required this.emojis});

  final EmojiCategory category;
  final List<ue.Emoji> emojis;
}

/// Dataset access for the custom emoji picker.
///
/// Wraps the `unicode_emojis` const dataset (same iamcal/emoji-data source as
/// the legacy picker): filters `obsoletedBy`, keeps global `sortOrder`,
/// groups by the nine legacy categories and resolves recents by char.
class EmojiRepository {
  EmojiRepository._();

  /// All usable emojis in global sort order (obsoleted excluded).
  static final List<ue.Emoji> all = _loadAll();

  /// Lookup by displayed char (base glyphs and skin-tone variants).
  static final Map<String, ue.Emoji> byChar = _indexByChar(all);

  static List<ue.Emoji> _loadAll() {
    final list = ue.UnicodeEmojis.allEmojis
        .where((e) => e.obsoletedBy == null)
        .toList();
    list.sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    return List.unmodifiable(list);
  }

  static Map<String, ue.Emoji> _indexByChar(List<ue.Emoji> emojis) {
    final map = <String, ue.Emoji>{};
    for (final e in emojis) {
      map.putIfAbsent(e.emoji, () => e);
      for (final v in e.skinVariations ?? const <ue.Emoji>[]) {
        map.putIfAbsent(v.emoji, () => v);
      }
    }
    return map;
  }

  /// Builds the section list: recents first (if any), then the nine
  /// categories in legacy order. Mirrors legacy `sections` memo.
  static List<EmojiSection> buildSections(List<String> recentChars) {
    final sections = <EmojiSection>[];
    if (recentChars.isNotEmpty) {
      final recents = recentChars
          .map((c) => byChar[c])
          .whereType<ue.Emoji>()
          .toList();
      if (recents.isNotEmpty) {
        sections.add(
          EmojiSection(category: EmojiCategory.recents, emojis: recents),
        );
      }
    }
    for (final category in EmojiCategory.values) {
      if (category == EmojiCategory.recents) continue;
      final datasetCategory = category.datasetCategory!;
      final emojis = all
          .where((e) => e.category == datasetCategory)
          .toList();
      if (emojis.isNotEmpty) {
        sections.add(EmojiSection(category: category, emojis: emojis));
      }
    }
    return sections;
  }

  /// Case-insensitive substring search over unicode name, short names,
  /// category description and ASCII texts. Result order follows the global
  /// sort order, like the legacy picker.
  static List<ue.Emoji> search(String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return const [];
    return all.where((e) {
      if (e.name.toLowerCase().contains(q)) return true;
      if (e.shortName.toLowerCase().contains(q)) return true;
      if (e.category.description.toLowerCase().contains(q)) return true;
      for (final s in e.shortNames) {
        if (s.toLowerCase().contains(q)) return true;
      }
      if ((e.text ?? '').toLowerCase().contains(q)) return true;
      for (final t in e.texts ?? const <String>[]) {
        if (t.toLowerCase().contains(q)) return true;
      }
      return false;
    }).toList();
  }
}
