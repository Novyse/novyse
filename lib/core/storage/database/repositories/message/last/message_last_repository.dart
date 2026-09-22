import 'package:flutter/foundation.dart' show debugPrint;
import 'package:novyse/core/storage/database/repositories/message/helpers/message_repository_context.dart';

/// Repository for querying the most recent message(s) of a chat or thread.
class MessageLastRepository {
  final MessageRepositoryContext _repo;
  MessageLastRepository(this._repo);

  /// Returns the latest single message for a given chat UUID.
  Future<List<Map<String, dynamic>>> get(String chatUUID) async {
    try {
      final rows = await _repo.db.rawQuery(
        '''
        SELECT m.*, u.name as sender_name, u.profilePictureUUID as profile_picture_uuid
        FROM message m
        LEFT JOIN user u ON m.senderUUID = u.uuid
        WHERE m.chatUUID = ?
        ORDER BY m.created_at DESC
        LIMIT 1;
        ''',
        [chatUUID],
      );

      final result = rows.map((r) => Map<String, dynamic>.from(r)).toList();
      for (final msg in result) {
        await _repo.addInfos(msg);
      }
      return result;
    } catch (e) {
      debugPrint('Error getting last message for chat: $e');
      return [];
    }
  }

  /// Returns the latest message for each subID within a chat UUID.
  Future<List<Map<String, dynamic>>> getBySub(String chatUUID) async {
    try {
      final rows = await _repo.db.rawQuery(
        '''
        SELECT m.*, u.name as sender_name, u.profilePictureUUID as profile_picture_uuid
        FROM message m
        LEFT JOIN user u ON m.senderUUID = u.uuid
        INNER JOIN (
          SELECT subID, MAX(created_at) as max_time
          FROM message
          WHERE chatUUID = ?
          GROUP BY subID
        ) latest ON m.subID = latest.subID AND m.created_at = latest.max_time
        WHERE m.chatUUID = ?;
        ''',
        [chatUUID, chatUUID],
      );

      final result = rows.map((r) => Map<String, dynamic>.from(r)).toList();
      for (final msg in result) {
        await _repo.addInfos(msg);
      }
      return result;
    } catch (e) {
      debugPrint('Error getting last messages by sub for chat: $e');
      return [];
    }
  }
}
