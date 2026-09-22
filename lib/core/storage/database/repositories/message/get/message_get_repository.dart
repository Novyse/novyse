import 'package:flutter/foundation.dart' show debugPrint;
import 'package:novyse/core/storage/database/repositories/message/helpers/message_field_parser.dart';
import 'package:novyse/core/storage/database/repositories/message/helpers/message_repository_context.dart';

/// Repository for querying messages.
class MessageGetRepository {
  final MessageRepositoryContext _repo;
  MessageGetRepository(this._repo);

  late final MessageGetByRepository by = MessageGetByRepository(_repo);
}

/// Repository for querying messages by specific attributes (id, chatUUID, subID).
class MessageGetByRepository {
  final MessageRepositoryContext _repo;
  MessageGetByRepository(this._repo);

  /// Retrieves a single message by ID.
  Future<Map<String, dynamic>?> id(
    String chatUUID,
    int subID,
    dynamic messageID,
  ) async {
    try {
      final parsedId = MessageFieldParser.parseId(messageID);
      final rows = await _repo.db.rawQuery(
        '''
        SELECT m.*, u.name as sender_name, u.profilePictureUUID as profile_picture_uuid
        FROM message m
        LEFT JOIN user u ON m.senderUUID = u.uuid
        WHERE m.chatUUID = ? AND m.subID = ? AND m.id = ? LIMIT 1;
        ''',
        [chatUUID, subID, parsedId],
      );

      if (rows.isEmpty) return null;
      final msg = Map<String, dynamic>.from(rows.first);
      await _repo.addInfos(msg);
      return msg;
    } catch (e) {
      debugPrint('Error retrieving message: $e');
      return null;
    }
  }

  /// Retrieves messages for a chat UUID in chronological order.
  Future<List<Map<String, dynamic>>> chatUUID(
    String chatUUID, {
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      final rows = await _repo.db.rawQuery(
        '''
        SELECT m.*, u.name as sender_name, u.profilePictureUUID as profile_picture_uuid
        FROM message m
        LEFT JOIN user u ON m.senderUUID = u.uuid
        WHERE m.chatUUID = ?
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?;
        ''',
        [chatUUID, limit, offset],
      );

      // Reverse to maintain chronological order
      final messages = rows.reversed
          .map((r) => Map<String, dynamic>.from(r))
          .toList();
      for (final message in messages) {
        await _repo.addInfos(message);
      }
      return messages;
    } catch (e) {
      debugPrint('Error retrieving messages by chat UUID: $e');
      return [];
    }
  }

  /// Retrieves messages for a sub-channel / thread in chronological order.
  Future<List<Map<String, dynamic>>> sub(
    String chatUUID,
    int subID, {
    int limit = 50,
    int offset = 0,
    String? beforeTime,
  }) async {
    try {
      final List<dynamic> args = [chatUUID, subID];
      String timeClause = '';
      if (beforeTime != null && beforeTime.isNotEmpty) {
        timeClause = 'AND m.created_at < ? ';
        args.add(beforeTime);
      }
      args.add(limit);
      args.add(offset);

      final rows = await _repo.db.rawQuery('''
        SELECT m.*, u.name as sender_name, u.profilePictureUUID as profile_picture_uuid
        FROM message m
        LEFT JOIN user u ON m.senderUUID = u.uuid
        WHERE m.chatUUID = ? AND m.subID = ? $timeClause
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?;
        ''', args);

      final messages = rows.reversed
          .map((r) => Map<String, dynamic>.from(r))
          .toList();
      for (final message in messages) {
        await _repo.addInfos(message);
      }
      return messages;
    } catch (e) {
      debugPrint('Error retrieving messages by chatUUID and subID: $e');
      return [];
    }
  }
}
