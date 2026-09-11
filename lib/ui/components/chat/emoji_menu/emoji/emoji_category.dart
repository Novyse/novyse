import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:unicode_emojis/unicode_emojis.dart' as ue;

/// Emoji sections in display order, mirroring the legacy `EmojiPicker`.
///
/// [recents] is virtual (built from [EmojiRecentsStore]); the other nine map
/// 1:1 to [ue.Category] descriptions from the iamcal/emoji-data dataset.
enum EmojiCategory {
  recents,
  smileys,
  people,
  animals,
  food,
  travel,
  activities,
  objects,
  symbols,
  flags;

  /// The backing dataset category, or null for the virtual sections.
  ue.Category? get datasetCategory => switch (this) {
    EmojiCategory.recents => null,
    EmojiCategory.smileys => ue.Category.smileysAndEmotion,
    EmojiCategory.people => ue.Category.peopleAndBody,
    EmojiCategory.animals => ue.Category.animalsAndNature,
    EmojiCategory.food => ue.Category.foodAndDrink,
    EmojiCategory.travel => ue.Category.travelAndPlaces,
    EmojiCategory.activities => ue.Category.activities,
    EmojiCategory.objects => ue.Category.objects,
    EmojiCategory.symbols => ue.Category.symbols,
    EmojiCategory.flags => ue.Category.flags,
  };

  String label(AppLocalizations l10n) => switch (this) {
    EmojiCategory.recents => l10n.emojiRecents,
    EmojiCategory.smileys => l10n.emojiCatSmileys,
    EmojiCategory.people => l10n.emojiCatPeople,
    EmojiCategory.animals => l10n.emojiCatAnimals,
    EmojiCategory.food => l10n.emojiCatFood,
    EmojiCategory.travel => l10n.emojiCatTravel,
    EmojiCategory.activities => l10n.emojiCatActivities,
    EmojiCategory.objects => l10n.emojiCatObjects,
    EmojiCategory.symbols => l10n.emojiCatSymbols,
    EmojiCategory.flags => l10n.emojiCatFlags,
  };

  List<List<dynamic>> get icon => switch (this) {
    EmojiCategory.recents => HugeIcons.strokeRoundedClock01,
    EmojiCategory.smileys => HugeIcons.strokeRoundedSmile,
    EmojiCategory.people => HugeIcons.strokeRoundedUser,
    EmojiCategory.animals => HugeIcons.strokeRoundedLeaf01,
    EmojiCategory.food => HugeIcons.strokeRoundedApple01,
    EmojiCategory.travel => HugeIcons.strokeRoundedCompass,
    EmojiCategory.activities => HugeIcons.strokeRoundedBasketball01,
    EmojiCategory.objects => HugeIcons.strokeRoundedSettings01,
    EmojiCategory.symbols => HugeIcons.strokeRoundedAlphabetGreek,
    EmojiCategory.flags => HugeIcons.strokeRoundedFlag02,
  };
}
