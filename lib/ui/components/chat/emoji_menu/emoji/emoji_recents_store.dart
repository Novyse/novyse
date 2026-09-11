import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_recents_store.dart'
    show sharedPreferencesProvider;
import 'package:shared_preferences/shared_preferences.dart';

/// Persists recently used emojis across restarts (per-device).
class EmojiRecentsStore extends StateNotifier<List<String>> {
  EmojiRecentsStore([this._prefs]) : super(const []) {
    _load();
  }

  static const storageKey = 'novyse-recent-emojis';
  static const maxRecents = 24;

  final SharedPreferences? _prefs;

  void _load() {
    final raw = _prefs?.getString(storageKey);
    if (raw == null || raw.isEmpty) return;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        state = decoded
            .whereType<String>()
            .where((e) => e.isNotEmpty)
            .take(maxRecents)
            .toList();
      }
    } catch (_) {
      // Ignore corrupt storage, keep empty.
    }
  }

  Future<void> push(String emoji) async {
    if (emoji.isEmpty) return;
    final updated = [emoji, ...state.where((e) => e != emoji)]
        .take(maxRecents)
        .toList();
    state = updated;
    try {
      await _prefs?.setString(storageKey, jsonEncode(updated));
    } catch (_) {
      // Best-effort persistence.
    }
  }

  Future<void> clear() async {
    state = const [];
    try {
      await _prefs?.remove(storageKey);
    } catch (_) {}
  }
}

final emojiRecentsProvider =
    StateNotifierProvider<EmojiRecentsStore, List<String>>((ref) {
      try {
        final prefs = ref.watch(sharedPreferencesProvider);
        return EmojiRecentsStore(prefs);
      } catch (_) {
        return EmojiRecentsStore();
      }
    });
