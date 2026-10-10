import 'package:flutter/foundation.dart' show debugPrint;
import 'package:novyse/core/storage/database/repositories/message/helpers/message_field_parser.dart';
import 'package:novyse/core/storage/database/repositories/message/helpers/message_repository_context.dart';

/// Stores the read-receipt watermarks.
class MessageReadRepository {
  final MessageRepositoryContext _repo;
  MessageReadRepository(this._repo);

  Future<bool> add(
    String chatUUID,
    int subID,
    dynamic messageID,
    String userUUID,
    String readAt,
  ) async {
    try {
      final id = MessageFieldParser.parseId(messageID);
      await _repo.db.execute(
        '''
        INSERT OR IGNORE INTO message_read (chatUUID, subID, messageID, userUUID, readAt)
        VALUES (?, ?, ?, ?, ?);
        ''',
        [chatUUID, subID, id, userUUID, readAt],
      );
      return true;
    } catch (e) {
      debugPrint('Error adding read tracking: $e');
      return false;
    }
  }

  /// Loads the unread anchor in a single round trip: the reader's watermark
  /// (greatest message read) and the first unread incoming message id
  /// (smallest incoming id above the watermark), where the chat opens and
  /// the unread divider is anchored. Zeros when there is nothing unread.
  Future<({int firstUnreadId, int watermark})> getUnreadAnchor(
    String chatUUID,
    int subID,
    String localUserUUID,
  ) async {
    try {
      final rows = await _repo.db.rawQuery(
        '''
        SELECT
          (SELECT COALESCE(MAX(messageID), 0) FROM message_read
            WHERE chatUUID = ? AND subID = ? AND userUUID = ?) as watermark,
          COALESCE(MIN(m.id), 0) as firstUnreadId FROM message m
        WHERE m.chatUUID = ? AND m.subID = ? AND m.senderUUID != ?
          AND m.id > (
            SELECT COALESCE(MAX(messageID), 0) FROM message_read
            WHERE chatUUID = ? AND subID = ? AND userUUID = ?
          );
        ''',
        [
          chatUUID,
          subID,
          localUserUUID,
          chatUUID,
          subID,
          localUserUUID,
          chatUUID,
          subID,
          localUserUUID,
        ],
      );
      final row = rows.first;
      return (
        firstUnreadId: (row['firstUnreadId'] as num?)?.toInt() ?? 0,
        watermark: (row['watermark'] as num?)?.toInt() ?? 0,
      );
    } catch (e) {
      debugPrint('Error getting unread anchor: $e');
      return (firstUnreadId: 0, watermark: 0);
    }
  }
}
