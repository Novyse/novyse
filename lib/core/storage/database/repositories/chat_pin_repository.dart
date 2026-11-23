import 'package:flutter/foundation.dart' show debugPrint;

import 'chat_repository.dart';

class ChatPinRepository {
  final DbProvider _db;
  ChatPinRepository(DbProvider db) : _db = db;

  Future<bool> add(String chatUUID, int position) async {
    try {
      if (chatUUID.isEmpty) return false;

      final order = await _readOrder();
      order.remove(chatUUID);
      final index = position < 0
          ? 0
          : (position > order.length ? order.length : position);
      order.insert(index, chatUUID);
      await _writeOrder(order);

      return true;
    } catch (e) {
      debugPrint('Error pinning chat: $e');
      return false;
    }
  }

  Future<bool> remove(String chatUUID) async {
    try {
      if (chatUUID.isEmpty) return false;

      final order = await _readOrder();
      if (!order.remove(chatUUID)) return true;
      await _writeOrder(order);

      return true;
    } catch (e) {
      debugPrint('Error unpinning chat: $e');
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> get() async {
    try {
      final rows = await _db().rawQuery(
        'SELECT * FROM chat_pin ORDER BY position ASC;',
      );
      return rows.map((r) => Map<String, dynamic>.from(r)).toList();
    } catch (e) {
      debugPrint('Error getting pinned chats: $e');
      return [];
    }
  }

  /// The pinned chats in display order.
  Future<List<String>> _readOrder() async {
    final rows = await _db().rawQuery(
      'SELECT chatUUID FROM chat_pin ORDER BY position ASC, chatUUID ASC;',
    );
    return [for (final row in rows) row['chatUUID'] as String];
  }

  /// Rewrites the pins so that the positions are contiguous and follow
  /// [order], exactly like the normalization of the backend.
  Future<void> _writeOrder(List<String> order) async {
    final batch = _db().batch();
    batch.delete('chat_pin');
    for (var index = 0; index < order.length; index++) {
      batch.insert('chat_pin', {'chatUUID': order[index], 'position': index});
    }
    await batch.commit(noResult: true);
  }
}
