import 'package:flutter/foundation.dart' show debugPrint;

import 'chat_repository.dart';

class ChatSubRepository {
  final DbProvider _db;
  ChatSubRepository(DbProvider db) : _db = db;

  Future<bool> add(String chatUUID, Map<String, dynamic> sub) async {
    try {
      final subId = sub['id'] is num ? (sub['id'] as num).toInt() : 0;
      await _db().execute(
        '''
        INSERT OR IGNORE INTO chat_sub (id, chatUUID, name, type, created_at)
        VALUES (?, ?, ?, ?, ?);
        ''',
        [
          subId,
          chatUUID,
          sub['name'],
          sub['type'],
          sub['created_at'] ??
              sub['createdAt'] ??
              DateTime.now().toIso8601String(),
        ],
      );
      return true;
    } catch (e) {
      debugPrint('Error adding sub: $e');
      return false;
    }
  }

  Future<bool> update(
    String chatUUID,
    int subID,
    Map<String, dynamic> sub,
  ) async {
    try {
      await _db().execute(
        'UPDATE chat_sub SET name = ? WHERE chatUUID = ? AND id = ?;',
        [sub['name'], chatUUID, subID],
      );
      return true;
    } catch (e) {
      debugPrint('Error updating sub: $e');
      return false;
    }
  }

  Future<bool> remove(String chatUUID, int subID) async {
    try {
      await _db().execute(
        'DELETE FROM message WHERE chatUUID = ? AND subID = ?;',
        [chatUUID, subID],
      );
      await _db().execute(
        'DELETE FROM chat_sub WHERE chatUUID = ? AND id = ?;',
        [chatUUID, subID],
      );
      return true;
    } catch (e) {
      debugPrint('Error removing sub: $e');
      return false;
    }
  }
}
