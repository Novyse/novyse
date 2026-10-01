import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_recents_store.dart'
    show sharedPreferencesProvider;
import 'package:shared_preferences/shared_preferences.dart';

/// Persists recently used emojis across restarts (per-device).
class EmojiRecentsStore extends Notifier<List<String>> {
  static const storageKey = 'novyse-recent-emojis';
  static const maxRecents = 24;

  SharedPreferences? get _prefs {
    // Tests and early startup may run without an override; recents then stay
    // in-memory only.
    try {
      return ref.read(sharedPreferencesProvider);
    } catch (_) {
      return null;
    }
  }

  @override
  List<String> build() {
    final raw = _prefs?.getString(storageKey);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is List) {
        return decoded
            .whereType<String>()
            .where((e) => e.isNotEmpty)
            .take(maxRecents)
            .toList();
      }
    } catch (e) {
      debugPrint('[EmojiRecents] Ignoring corrupt storage: $e');
    }
    return const [];
  }

  Future<void> push(String emoji) async {
    if (emoji.isEmpty) return;
    final updated = [
      emoji,
      ...state.where((e) => e != emoji),
    ].take(maxRecents).toList();
    state = updated;
    try {
      await _prefs?.setString(storageKey, jsonEncode(updated));
    } catch (e) {
      debugPrint('[EmojiRecents] Persist failed: $e');
    }
  }

  Future<void> clear() async {
    state = const [];
    try {
      await _prefs?.remove(storageKey);
    } catch (e) {
      debugPrint('[EmojiRecents] Clear failed: $e');
    }
  }
}

final emojiRecentsProvider = NotifierProvider<EmojiRecentsStore, List<String>>(
  EmojiRecentsStore.new,
);
