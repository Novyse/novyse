import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persists most-used GIFs across restarts (per-device).
/// Ordered by number of uses (most used first).
class GifRecentsStore extends Notifier<List<GifItem>> {
  static const storageKey = 'novyse-recent-gifs';
  static const maxRecents = 24;

  final _gifs = <String, GifItem>{};
  final _uses = <String, int>{};

  SharedPreferences get _prefs => ref.read(sharedPreferencesProvider);

  @override
  List<GifItem> build() {
    _gifs.clear();
    _uses.clear();
    final raw = _prefs.getString(storageKey);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final decoded = jsonDecode(raw) as Map;
      for (final e in decoded.entries) {
        final id = e.key.toString();
        final m = Map<String, dynamic>.from(e.value as Map);
        final gif = GifItem.fromJson(Map<String, dynamic>.from(m['gif']));
        if (gif.url.isEmpty) continue;
        _gifs[id] = gif;
        _uses[id] = (m['uses'] as num).toInt();
      }
      final ids = _uses.keys.toList()
        ..sort((a, b) => _uses[b]!.compareTo(_uses[a]!));
      return [for (final id in ids.take(maxRecents)) _gifs[id]!];
    } catch (e) {
      debugPrint('[GifRecents] Ignoring corrupt storage: $e');
    }
    return const [];
  }

  Future<void> push(GifItem gif) async {
    _gifs[gif.id] = gif;
    _uses[gif.id] = (_uses[gif.id] ?? 0) + 1;
    final ids = _uses.keys.toList()
      ..sort((a, b) => _uses[b]!.compareTo(_uses[a]!));
    state = [for (final id in ids.take(maxRecents)) _gifs[id]!];
    try {
      await _prefs.setString(
        storageKey,
        jsonEncode({
          for (final id in _uses.keys)
            id: {'gif': _gifs[id]!.toJson(), 'uses': _uses[id]},
        }),
      );
    } catch (e) {
      debugPrint('[GifRecents] Persist failed: $e');
    }
  }

  Future<void> clear() async {
    _gifs.clear();
    _uses.clear();
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
