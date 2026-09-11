import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists recently used GIFs across restarts (per-device).
///
/// Mirrors the legacy `novyse-recent-gifs` AsyncStorage key (max 24).
/// Emoji recents live in the sibling [EmojiRecentsStore] (custom single
/// list, no picker library).
class GifRecentsStore extends StateNotifier<List<GifItem>> {
  GifRecentsStore(this._prefs)
    : super(const []) {
    _load();
  }

  static const storageKey = 'novyse-recent-gifs';
  static const maxRecents = 24;

  final SharedPreferences _prefs;

  void _load() {
    final raw = _prefs.getString(storageKey);
    if (raw == null || raw.isEmpty) return;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        state = decoded
            .whereType<Map>()
            .map((e) => GifItem.fromJson(Map<String, dynamic>.from(e)))
            .where((g) => g.url.isNotEmpty)
            .take(maxRecents)
            .toList();
      }
    } catch (_) {
      // Ignore corrupt storage, keep empty.
    }
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
    } catch (_) {
      // Best-effort persistence.
    }
  }

  Future<void> clear() async {
    state = const [];
    try {
      await _prefs.remove(storageKey);
    } catch (_) {}
  }
}

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('Override sharedPreferencesProvider in main/test');
});

final gifRecentsProvider =
    StateNotifierProvider<GifRecentsStore, List<GifItem>>((ref) {
      final prefs = ref.watch(sharedPreferencesProvider);
      return GifRecentsStore(prefs);
    });
