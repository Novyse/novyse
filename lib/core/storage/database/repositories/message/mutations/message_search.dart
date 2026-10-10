import 'package:flutter/foundation.dart' show debugPrint;
import 'package:sqflite/sqflite.dart';

/// Handles searching messages by text content with optional chatUUID and subID filters.
class MessageSearch {
  final DatabaseExecutor Function() _getDb;

  MessageSearch(this._getDb);

  DatabaseExecutor get db => _getDb();

  /// Searches messages by content with optional chatUUID and subID filters.
  Future<List<Map<String, dynamic>>> search(
    String query, {
    String? chatUUID,
    int? subID,
    int limit = 50,
  }) async {
    try {
      final trimmed = query.trim();
      if (trimmed.isEmpty) return [];

      final escaped = trimmed
          .replaceAll(r'\', r'\\')
          .replaceAll('%', r'\%')
          .replaceAll('_', r'\_');
      final like = '%$escaped%';

      final conditions = <String>[
        'm.content IS NOT NULL',
        "m.content LIKE ? ESCAPE '\\'",
        "m.type = 'message'",
      ];
      final params = <dynamic>[like];

      if (chatUUID != null && chatUUID.isNotEmpty) {
        conditions.add('m.chatUUID = ?');
        params.add(chatUUID);
        if (subID != null) {
          conditions.add('m.subID = ?');
          params.add(subID);
        }
      }

      params.add(limit);

      final rows = await db.rawQuery('''
        SELECT m.id, m.chatUUID, m.subID, m.senderUUID, m.content, m.type, m.created_at,
               u.name as sender_name, u.profilePictureUUID as profile_picture_uuid
        FROM message m
        JOIN user u ON m.senderUUID = u.uuid
        WHERE ${conditions.join(' AND ')}
        ORDER BY m.created_at DESC
        LIMIT ?;
        ''', params);

      return rows.map((r) => Map<String, dynamic>.from(r)).toList();
    } catch (e) {
      debugPrint('Error searching messages: $e');
      return [];
    }
  }
}
