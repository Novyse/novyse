import 'package:flutter/foundation.dart' show debugPrint;
import 'package:novyse/core/storage/database/repositories/message/helpers/message_field_parser.dart';
import 'package:novyse/core/storage/database/repositories/message/helpers/message_repository_context.dart';

/// Repository for managing favorite / starred messages in SQLite.
class MessageFavoriteRepository {
  final MessageRepositoryContext _repo;
  MessageFavoriteRepository(this._repo);

  /// Adds a message to favorites.
  Future<bool> add(
    String chatUUID,
    int subID,
    dynamic messageID, [
    String? createdAt,
  ]) async {
    try {
      final id = MessageFieldParser.parseId(messageID);
      await _repo.db.execute(
        '''
        INSERT OR IGNORE INTO favorite_message (chatUUID, subID, messageID, createdAt)
        VALUES (?, ?, ?, ?);
        ''',
        [chatUUID, subID, id, createdAt ?? DateTime.now().toIso8601String()],
      );
      return true;
    } catch (e) {
      debugPrint('Error adding favorite message: $e');
      return false;
    }
  }

  /// Adds multiple favorites in sequence.
  Future<bool> addMultiple(List<dynamic> favorites) async {
    try {
      if (favorites.isEmpty) return false;
      for (final raw in favorites) {
        if (raw is! Map) continue;
        final fav = Map<String, dynamic>.from(raw);
        final chatUUID = fav['chatUUID'] as String?;
        final subID = fav['subID'] != null
            ? MessageFieldParser.parseSubID(fav['subID'])
            : null;
        final messageID = fav['messageID'] ?? fav['id'];
        if (chatUUID == null || subID == null || messageID == null) continue;
        final createdAt = fav['createdAt'] as String?;
        await add(chatUUID, subID, messageID, createdAt);
      }
      return true;
    } catch (e) {
      debugPrint('Error adding multiple favorites: $e');
      return false;
    }
  }

  /// Removes a message from favorites.
  Future<bool> remove(String chatUUID, int subID, dynamic messageID) async {
    try {
      final id = MessageFieldParser.parseId(messageID);
      await _repo.db.execute(
        'DELETE FROM favorite_message WHERE chatUUID = ? AND subID = ? AND messageID = ?;',
        [chatUUID, subID, id],
      );
      return true;
    } catch (e) {
      debugPrint('Error removing favorite message: $e');
      return false;
    }
  }

  /// Checks if a specific message is favorited.
  Future<bool> isFavorite(
    String chatUUID,
    int subID,
    dynamic messageID,
  ) async {
    try {
      final id = MessageFieldParser.parseId(messageID);
      final rows = await _repo.db.rawQuery(
        'SELECT 1 FROM favorite_message WHERE chatUUID = ? AND subID = ? AND messageID = ? LIMIT 1;',
        [chatUUID, subID, id],
      );
      return rows.isNotEmpty;
    } catch (e) {
      debugPrint('Error checking favorite message: $e');
      return false;
    }
  }

  /// Returns enriched favorite messages, optionally filtered by chat.
  Future<List<Map<String, dynamic>>> list({String? chatUUID}) async {
    try {
      final where = chatUUID != null && chatUUID.isNotEmpty
          ? 'WHERE f.chatUUID = ?'
          : '';
      final args = chatUUID != null && chatUUID.isNotEmpty
          ? <dynamic>[chatUUID]
          : <dynamic>[];
      final rows = await _repo.db.rawQuery(
        '''
        SELECT f.chatUUID, f.subID, f.messageID, f.createdAt as favoritedAt,
               m.*, u.name as sender_name, u.profilePictureUUID as profile_picture_uuid
        FROM favorite_message f
        LEFT JOIN message m ON m.chatUUID = f.chatUUID AND m.subID = f.subID AND m.id = f.messageID
        LEFT JOIN user u ON m.senderUUID = u.uuid
        $where
        ORDER BY f.createdAt DESC;
        ''',
        args,
      );
      final out = <Map<String, dynamic>>[];
      for (final row in rows) {
        final msg = Map<String, dynamic>.from(row);
        // If the underlying message was deleted, still return the favorite
        // entry so the UI can show a placeholder / allow unfavorite.
        msg['favorited'] = true;
        await _repo.addInfos(msg);
        // Ensure id/subID fall back to favorite keys when message is gone.
        msg['id'] ??= msg['messageID'];
        msg['subID'] ??= row['subID'];
        out.add(msg);
      }
      return out;
    } catch (e) {
      debugPrint('Error listing favorite messages: $e');
      return [];
    }
  }

  /// Convenience method for listing favorite messages for a specific chat.
  Future<List<Map<String, dynamic>>> getByChat(String chatUUID) =>
      list(chatUUID: chatUUID);

  /// Counts favorite messages globally or for a chat.
  Future<int> count({String? chatUUID}) async {
    try {
      final rows = chatUUID != null && chatUUID.isNotEmpty
          ? await _repo.db.rawQuery(
              'SELECT COUNT(*) as c FROM favorite_message WHERE chatUUID = ?;',
              [chatUUID],
            )
          : await _repo.db.rawQuery(
              'SELECT COUNT(*) as c FROM favorite_message;',
            );
      if (rows.isEmpty) return 0;
      final v = rows.first['c'];
      if (v is num) return v.toInt();
      return int.tryParse('$v') ?? 0;
    } catch (_) {
      return 0;
    }
  }
}
