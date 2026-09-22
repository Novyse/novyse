import 'package:flutter/foundation.dart' show debugPrint;
import 'package:novyse/core/storage/database/repositories/message/helpers/message_field_parser.dart';
import 'package:novyse/core/storage/database/repositories/message/helpers/message_repository_context.dart';

/// Repository for recording read receipts on messages.
class MessageReadRepository {
  final MessageRepositoryContext _repo;
  MessageReadRepository(this._repo);

  /// Records a read receipt for a user on a message.
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
        INSERT OR IGNORE INTO message_read (chat_uuid, sub_id, message_id, user_uuid, read_at)
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
}
