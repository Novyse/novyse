import 'package:flutter/foundation.dart' show debugPrint;
import 'package:novyse/core/storage/database/repositories/message/helpers/message_field_parser.dart';
import 'package:novyse/core/storage/database/repositories/message/helpers/message_repository_context.dart';

/// Repository for managing pinned messages in SQLite.
class MessagePinRepository {
  final MessageRepositoryContext _repo;
  MessagePinRepository(this._repo);

  /// Pins a message in a chat and subID.
  Future<bool> add(
    String chatUUID,
    int subID,
    dynamic messageID, [
    String? pinnedAt,
    String? pinnedBy,
  ]) async {
    try {
      final id = MessageFieldParser.parseId(messageID);
      await _repo.db.execute(
        '''
        INSERT OR IGNORE INTO pinned_message (chatUUID, subID, messageID, pinned_at, pinned_by)
        VALUES (?, ?, ?, ?, ?);
        ''',
        [
          chatUUID,
          subID,
          id,
          pinnedAt ?? DateTime.now().toIso8601String(),
          pinnedBy ?? '',
        ],
      );
      return true;
    } catch (e) {
      debugPrint('Error pinning message: $e');
      return false;
    }
  }

  /// Unpins a message in a chat and subID.
  Future<bool> remove(String chatUUID, int subID, dynamic messageID) async {
    try {
      final id = MessageFieldParser.parseId(messageID);
      await _repo.db.execute(
        'DELETE FROM pinned_message WHERE chatUUID = ? AND subID = ? AND messageID = ?;',
        [chatUUID, subID, id],
      );
      return true;
    } catch (e) {
      debugPrint('Error unpinning message: $e');
      return false;
    }
  }

  /// Retrieves all pinned messages for a chat.
  Future<List<Map<String, dynamic>>> get(String chatUUID) async {
    try {
      final rows = await _repo.db.rawQuery(
        'SELECT subID, messageID, pinned_at, pinned_by FROM pinned_message WHERE chatUUID = ? ORDER BY pinned_at ASC;',
        [chatUUID],
      );
      return rows.map((r) => Map<String, dynamic>.from(r)).toList();
    } catch (e) {
      debugPrint('Error retrieving pinned messages: $e');
      return [];
    }
  }
}
