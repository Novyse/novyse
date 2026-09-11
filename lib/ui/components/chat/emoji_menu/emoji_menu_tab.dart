import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';

/// Tabs of the emoji menu, mirroring legacy `TabType`.
enum EmojiMenuTab { emoji, sticker, gif }

extension EmojiMenuTabX on EmojiMenuTab {
  String label(AppLocalizations l10n) => switch (this) {
    EmojiMenuTab.emoji => l10n.emojiMenuEmoji,
    EmojiMenuTab.sticker => l10n.emojiMenuSticker,
    EmojiMenuTab.gif => l10n.emojiMenuGif,
  };

  List<List<dynamic>> get icon => switch (this) {
    EmojiMenuTab.emoji => HugeIcons.strokeRoundedSmile,
    EmojiMenuTab.sticker => HugeIcons.strokeRoundedSticker,
    EmojiMenuTab.gif => HugeIcons.strokeRoundedGif01,
  };
}
