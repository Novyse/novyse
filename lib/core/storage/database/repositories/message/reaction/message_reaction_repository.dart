import 'package:flutter/foundation.dart' show debugPrint;
import 'package:novyse/core/storage/database/repositories/message/helpers/message_field_parser.dart';
import 'package:novyse/core/storage/database/repositories/message/helpers/message_repository_context.dart';

/// Repository for adding and removing emoji reactions on messages.
class MessageReactionRepository {
  final MessageRepositoryContext _repo;
  MessageReactionRepository(this._repo);

  /// Adds a reaction to a message.
  Future<bool> add(
    String chatUUID,
    int subID,
    dynamic messageID,
    String emoji,
    String at,
    String userUUID,
  ) async {
    try {
      final id = MessageFieldParser.parseId(messageID);
      await _repo.db.execute(
        '''
        INSERT OR IGNORE INTO reaction_message (chatUUID, subID, messageID, userUUID, reaction, at)
        VALUES (?, ?, ?, ?, ?, ?);
        ''',
        [chatUUID, subID, id, userUUID, emoji, at],
      );
      return true;
    } catch (e) {
      debugPrint('Error adding reaction: $e');
      return false;
    }
  }

  /// Removes a user's reaction from a message.
  Future<bool> remove(
    String chatUUID,
    int subID,
    dynamic messageID,
    String emoji,
    String userUUID,
  ) async {
    try {
      final id = MessageFieldParser.parseId(messageID);
      await _repo.db.execute(
        '''
        DELETE FROM reaction_message
        WHERE chatUUID = ? AND subID = ? AND messageID = ? AND userUUID = ? AND reaction = ?;
        ''',
        [chatUUID, subID, id, userUUID, emoji],
      );
      return true;
    } catch (e) {
      debugPrint('Error removing reaction: $e');
      return false;
    }
  }
}
