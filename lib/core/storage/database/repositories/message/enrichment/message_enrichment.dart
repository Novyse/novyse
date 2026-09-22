import 'dart:convert';

import 'package:sqflite/sqflite.dart';
import 'package:novyse/core/storage/database/repositories/message/helpers/message_field_parser.dart';

/// Handles enriching raw message maps with associated records (reads, reactions,
/// replies, files, pinned/edited status, and favorite status).
class MessageEnrichment {
  final DatabaseExecutor Function() _getDb;

  MessageEnrichment(this._getDb);

  DatabaseExecutor get db => _getDb();

  /// Enriches a message map in-place with its related relational data.
  Future<void> addInfos(Map<String, dynamic> message) async {
    await _addReplyTos(message);
    await _addRepliedFroms(message);
    await _addReactions(message);
    await _addReads(message);
    await _addFiles(message);
    await _addEditedAndPinned(message);
    await _addFavorite(message);
  }

  Future<void> _addFavorite(Map<String, dynamic> message) async {
    if (message['favorited'] is bool) return;
    try {
      final chatUUID = MessageFieldParser.parseChatUUID(message);
      final subID = MessageFieldParser.parseSubID(message['subID']);
      final id = MessageFieldParser.parseMessageId(message);
      if (chatUUID == null || chatUUID.isEmpty) {
        message['favorited'] = false;
        return;
      }
      final rows = await db.rawQuery(
        'SELECT 1 FROM favorite_message WHERE chatUUID = ? AND subID = ? AND messageID = ? LIMIT 1;',
        [chatUUID, subID, id],
      );
      message['favorited'] = rows.isNotEmpty;
    } catch (_) {
      message['favorited'] = false;
    }
  }

  Future<void> _addReads(Map<String, dynamic> message) async {
    final chatUUID = MessageFieldParser.parseChatUUID(message);
    final subID = MessageFieldParser.parseSubID(message['subID']);
    final id = MessageFieldParser.parseMessageId(message);

    final rows = await db.rawQuery(
      'SELECT user_uuid, read_at FROM message_read WHERE chat_uuid = ? AND sub_id = ? AND message_id = ?;',
      [chatUUID, subID, id],
    );

    message['readBy'] = rows
        .map((r) => {'userUUID': r['user_uuid'], 'readAt': r['read_at']})
        .toList();
  }

  Future<void> _addReplyTos(Map<String, dynamic> message) async {
    final chatUUID = MessageFieldParser.parseChatUUID(message);
    final subID = MessageFieldParser.parseSubID(message['subID']);
    final id = MessageFieldParser.parseMessageId(message);

    final rows = await db.rawQuery(
      'SELECT * FROM message_reply WHERE chatUUID = ? AND subID = ? AND messageID = ?;',
      [chatUUID, subID, id],
    );

    message['replyTos'] = rows
        .map(
          (r) => {
            'chatUUID': r['replyTo_chatUUID'],
            'subID': r['replyTo_subID'],
            'messageID': r['replyTo_messageID'],
            'rangeStart': r['replyTo_rangeStart'],
            'rangeEnd': r['replyTo_rangeEnd'],
          },
        )
        .toList();
  }

  Future<void> _addRepliedFroms(Map<String, dynamic> message) async {
    final chatUUID = MessageFieldParser.parseChatUUID(message);
    final subID = MessageFieldParser.parseSubID(message['subID']);
    final id = MessageFieldParser.parseMessageId(message);

    final rows = await db.rawQuery(
      'SELECT chatUUID, subID, messageID FROM message_reply WHERE replyTo_chatUUID = ? AND replyTo_subID = ? AND replyTo_messageID = ?;',
      [chatUUID, subID, id],
    );

    message['repliedFroms'] = rows
        .map(
          (r) => {
            'chatUUID': r['chatUUID'],
            'subID': r['subID'],
            'messageID': r['messageID'],
          },
        )
        .toList();
  }

  Future<void> _addReactions(Map<String, dynamic> message) async {
    final chatUUID = MessageFieldParser.parseChatUUID(message);
    final subID = MessageFieldParser.parseSubID(message['subID']);
    final id = MessageFieldParser.parseMessageId(message);

    final rows = await db.rawQuery(
      'SELECT reaction, userUUID, at FROM reaction_message WHERE chatUUID = ? AND subID = ? AND messageID = ?;',
      [chatUUID, subID, id],
    );

    final map = <String, List<Map<String, dynamic>>>{};
    for (final r in rows) {
      final emoji = r['reaction'] as String;
      map.putIfAbsent(emoji, () => []).add({
        'userUUID': r['userUUID'],
        'at': r['at'],
      });
    }

    message['reactions'] = map.entries
        .map(
          (entry) => {
            'emoji': entry.key,
            'userUUIDs': entry.value.map((e) => e['userUUID']).toList(),
            'details': entry.value,
          },
        )
        .toList();
  }

  Future<void> _addFiles(Map<String, dynamic> message) async {
    final chatUUID = MessageFieldParser.parseChatUUID(message);
    final subID = MessageFieldParser.parseSubID(message['subID']);
    final id = MessageFieldParser.parseMessageId(message);

    final rows = await db.rawQuery(
      '''
      SELECT f.* FROM file f
      JOIN message_files mf ON f.uuid = mf.fileUUID
      WHERE mf.chatUUID = ? AND mf.subID = ? AND mf.messageID = ?;
      ''',
      [chatUUID, subID, id],
    );

    message['files'] = rows.map((r) {
      final file = Map<String, dynamic>.from(r);
      if (file['waveform'] is String) {
        try {
          file['waveform'] = jsonDecode(file['waveform'] as String);
        } catch (_) {}
      }
      return file;
    }).toList();
  }

  Future<void> _addEditedAndPinned(Map<String, dynamic> message) async {
    final chatUUID = MessageFieldParser.parseChatUUID(message);
    final subID = MessageFieldParser.parseSubID(message['subID']);
    final id = MessageFieldParser.parseMessageId(message);

    if (message['edited'] == null) {
      final editedRows = await db.rawQuery(
        'SELECT 1 FROM edited_message WHERE chatUUID = ? AND subID = ? AND messageID = ? LIMIT 1;',
        [chatUUID, subID, id],
      );
      message['edited'] = editedRows.isNotEmpty;
    } else {
      message['edited'] = MessageFieldParser.isEdited(message);
    }

    if (message['pinned'] == null) {
      final pinnedRows = await db.rawQuery(
        'SELECT 1 FROM pinned_message WHERE chatUUID = ? AND subID = ? AND messageID = ? LIMIT 1;',
        [chatUUID, subID, id],
      );
      message['pinned'] = pinnedRows.isNotEmpty;
    } else {
      message['pinned'] = MessageFieldParser.isPinned(message);
    }
  }
}
