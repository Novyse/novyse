import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists recently used GIFs across restarts (per-device).
///
/// Mirrors the legacy `novyse-recent-gifs` AsyncStorage key (max 24).
/// Emoji recents live in the sibling `EmojiRecentsStore` (custom single
/// list, no picker library).
class GifRecentsStore extends Notifier<List<GifItem>> {
  static const storageKey = 'novyse-recent-gifs';
  static const maxRecents = 24;

  SharedPreferences get _prefs => ref.read(sharedPreferencesProvider);

  @override
  List<GifItem> build() {
    final raw = _prefs.getString(storageKey);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded
            .whereType<Map>()
            .map((e) => GifItem.fromJson(Map<String, dynamic>.from(e)))
            .where((g) => g.url.isNotEmpty)
            .take(maxRecents)
            .toList();
      }
    } catch (e) {
      debugPrint('[GifRecents] Ignoring corrupt storage: $e');
    }
    return const [];
  }

  Future<void> push(GifItem gif) async {
    final updated = [
      gif,
      ...state.where((g) => g.id != gif.id),
    ].take(maxRecents).toList();
    state = updated;
    try {
      await _prefs.setString(
        storageKey,
        jsonEncode(updated.map((g) => g.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('[GifRecents] Persist failed: $e');
    }
  }

  Future<void> clear() async {
    state = const [];
    try {
      await _prefs.remove(storageKey);
    } catch (e) {
      debugPrint('[GifRecents] Clear failed: $e');
    }
  }
}

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('Override sharedPreferencesProvider in main/test');
});

final gifRecentsProvider = NotifierProvider<GifRecentsStore, List<GifItem>>(
  GifRecentsStore.new,
);
