import 'package:flutter/foundation.dart' show debugPrint;

import 'chat_repository.dart';

class ChatPinRepository {
  final DbProvider _db;
  ChatPinRepository(DbProvider db) : _db = db;

  Future<bool> add(String chatUUID, int position) async {
    try {
      if (chatUUID.isEmpty) return false;
      await _db().execute('DELETE FROM chat_pin WHERE chatUUID = ?;', [
        chatUUID,
      ]);
      await _db().execute(
        'UPDATE chat_pin SET position = position + 1 WHERE position >= ?;',
        [position],
      );
      await _db().execute(
        'INSERT INTO chat_pin (chatUUID, position) VALUES (?, ?);',
        [chatUUID, position],
      );
      return true;
    } catch (e) {
      debugPrint('Error pinning chat: $e');
      return false;
    }
  }

  Future<bool> remove(String chatUUID) async {
    try {
      if (chatUUID.isEmpty) return false;
      final rows = await _db().rawQuery(
        'SELECT position FROM chat_pin WHERE chatUUID = ? LIMIT 1;',
        [chatUUID],
      );
      if (rows.isNotEmpty) {
        final pos = (rows.first['position'] as num).toInt();
        await _db().execute('DELETE FROM chat_pin WHERE chatUUID = ?;', [
          chatUUID,
        ]);
        await _db().execute(
          'UPDATE chat_pin SET position = position - 1 WHERE position > ?;',
          [pos],
        );
      }
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
}
