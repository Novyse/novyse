import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_recents_store.dart'
    show sharedPreferencesProvider;
import 'package:shared_preferences/shared_preferences.dart';

/// Persists most-used emojis across restarts (per-device).
/// Ordered by number of uses (most used first).
class EmojiRecentsStore extends Notifier<List<String>> {
  static const storageKey = 'novyse-recent-emojis';
  static const maxRecents = 24;

  final _uses = <String, int>{};

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
    _uses.clear();
    final raw = _prefs?.getString(storageKey);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw) as Map;
      for (final e in decoded.entries) {
        _uses[e.key.toString()] = (e.value as num).toInt();
      }
      final ordered = _uses.keys.toList()
        ..sort((a, b) => _uses[b]!.compareTo(_uses[a]!));
      return ordered.take(maxRecents).toList();
    } catch (e) {
      debugPrint('[EmojiRecents] Ignoring corrupt storage: $e');
    }
    return const [];
  }

  Future<void> push(String emoji) async {
    if (emoji.isEmpty) return;
    _uses[emoji] = (_uses[emoji] ?? 0) + 1;
    final ordered = _uses.keys.toList()
      ..sort((a, b) => _uses[b]!.compareTo(_uses[a]!));
    state = ordered.take(maxRecents).toList();
    try {
      await _prefs?.setString(storageKey, jsonEncode(_uses));
    } catch (e) {
      debugPrint('[EmojiRecents] Persist failed: $e');
    }
  }

  Future<void> clear() async {
    _uses.clear();
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
