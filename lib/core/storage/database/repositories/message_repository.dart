import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:sqflite/sqflite.dart';

class MessageRepository {
  DatabaseExecutor? _db;

  MessageRepository([this._db]);

  void setDb(DatabaseExecutor db) {
    _db = db;
  }

  DatabaseExecutor get db {
    final database = _db;
    if (database == null) {
      throw StateError(
        'MessageRepository: database is not set or initialized.',
      );
    }
    return database;
  }

  late final MessageGetRepository get = MessageGetRepository(this);
  late final MessagePinRepository pin = MessagePinRepository(this);
  late final MessageLastRepository last = MessageLastRepository(this);
  late final MessageReactionRepository reaction = MessageReactionRepository(
    this,
  );
  late final MessageReadRepository read = MessageReadRepository(this);

  /// Helper to safely parse a message ID to an int.
  static int _parseId(dynamic id) {
    if (id is int) return id;
    if (id is num) return id.toInt();
    if (id is String) return int.tryParse(id) ?? 0;
    return 0;
  }

  /// Adds a single message and its associated replies, files, reads, and reactions.
  Future<bool> add(Map<String, dynamic> message) async {
    try {
      final rawId = message['id'];
      final chatUUID = message['chatUUID'] as String?;
      final senderUUID = message['senderUUID'] as String?;
      final createdAt =
          message['created_at'] ??
          message['createdAt'] ??
          DateTime.now().toIso8601String();

      if (rawId == null || chatUUID == null || senderUUID == null) {
        debugPrint(
          'Missing required message fields: id=$rawId, chatUUID=$chatUUID, senderUUID=$senderUUID',
        );
        return false;
      }

      final id = _parseId(rawId);
      final subID = message['subID'] is num
          ? (message['subID'] as num).toInt()
          : int.tryParse(message['subID']?.toString() ?? '0') ?? 0;

      final replyTo = message['replyTo'] is Map
          ? Map<String, dynamic>.from(message['replyTo'] as Map)
          : null;

      await db.rawInsert(
        '''
        INSERT OR IGNORE INTO message (
          id, chatUUID, subID, senderUUID, content, type, system_action, created_at,
          replyTo_chatUUID, replyTo_subID, replyTo_messageID, replyTo_rangeStart, replyTo_rangeEnd
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        ''',
        [
          id,
          chatUUID,
          subID,
          senderUUID,
          message['content'],
          message['type'] ?? 'message',
          message['system_action'],
          createdAt,
          replyTo?['chatUUID'],
          replyTo?['subID'] != null ? _parseId(replyTo!['subID']) : null,
          replyTo?['messageID'] != null
              ? _parseId(replyTo!['messageID'])
              : null,
          replyTo?['rangeStart'],
          replyTo?['rangeEnd'],
        ],
      );

      // ReplyTos
      if (message['replyTos'] is List) {
        for (final reply in message['replyTos'] as List) {
          if (reply is! Map) continue;
          final r = Map<String, dynamic>.from(reply);
          await db.rawInsert(
            '''
            INSERT OR IGNORE INTO message_reply (
              chatUUID, subID, messageID,
              replyTo_chatUUID, replyTo_subID, replyTo_messageID, replyTo_rangeStart, replyTo_rangeEnd
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            ''',
            [
              chatUUID,
              subID,
              id,
              r['chatUUID'] ?? r['replyTo_chatUUID'],
              r['subID'] != null
                  ? _parseId(r['subID'])
                  : _parseId(r['replyTo_subID']),
              r['messageID'] != null
                  ? _parseId(r['messageID'])
                  : _parseId(r['replyTo_messageID']),
              r['rangeStart'] ?? r['replyTo_rangeStart'],
              r['rangeEnd'] ?? r['replyTo_rangeEnd'],
            ],
          );
        }
      }

      // Files
      if (message['files'] is List) {
        for (final fileRaw in message['files'] as List) {
          if (fileRaw is! Map) continue;
          final file = Map<String, dynamic>.from(fileRaw);
          final fileUUID = file['uuid'] as String?;
          final name = file['name'] as String?;
          final mimeType = file['mimeType'] as String?;
          final size = file['size'] is num ? (file['size'] as num).toInt() : 0;

          if (fileUUID != null && name != null && mimeType != null) {
            final waveformStr = file['waveform'] != null
                ? (file['waveform'] is String
                      ? file['waveform']
                      : jsonEncode(file['waveform']))
                : null;

            await db.rawInsert(
              '''
              INSERT OR IGNORE INTO file (uuid, name, ref, mimeType, size, waveform, duration)
              VALUES (?, ?, ?, ?, ?, ?, ?);
              ''',
              [
                fileUUID,
                name,
                file['ref'],
                mimeType,
                size,
                waveformStr,
                file['duration'] ?? 0,
              ],
            );

            await db.rawInsert(
              '''
              INSERT OR IGNORE INTO message_files (chatUUID, subID, messageID, fileUUID)
              VALUES (?, ?, ?, ?);
              ''',
              [chatUUID, subID, id, fileUUID],
            );
          }
        }
      }

      // Reads
      final rawReads =
          message['reads'] ?? message['readBy'] ?? message['message_reads'];
      if (rawReads is List) {
        for (final readRaw in rawReads) {
          if (readRaw is! Map) continue;
          final r = Map<String, dynamic>.from(readRaw);
          final userUUID = (r['userUUID'] ?? r['user_uuid']) as String?;
          final readAt =
              (r['readAt'] ?? r['read_at'] ?? DateTime.now().toIso8601String())
                  as String;
          if (userUUID != null) {
            await db.rawInsert(
              '''
              INSERT OR IGNORE INTO message_read (chat_uuid, sub_id, message_id, user_uuid, read_at)
              VALUES (?, ?, ?, ?, ?);
              ''',
              [chatUUID, subID, id, userUUID, readAt],
            );
          }
        }
      }

      // Reactions
      if (message['reactions'] is List) {
        for (final reactionRaw in message['reactions'] as List) {
          if (reactionRaw is! Map) continue;
          final r = Map<String, dynamic>.from(reactionRaw);
          final userUUID = r['userUUID'] as String?;
          final emoji = (r['reaction'] ?? r['emoji']) as String?;
          final at =
              (r['at'] ?? r['created_at'] ?? DateTime.now().toIso8601String())
                  as String;
          if (userUUID != null && emoji != null) {
            await db.rawInsert(
              '''
              INSERT OR IGNORE INTO reaction_message (chatUUID, subID, messageID, userUUID, reaction, at)
              VALUES (?, ?, ?, ?, ?, ?);
              ''',
              [chatUUID, subID, id, userUUID, emoji, at],
            );
          }
        }
      }

      return true;
    } catch (e) {
      debugPrint('Error adding message: $e');
      return false;
    }
  }

  /// Adds multiple messages to the database in batch.
  Future<bool> addMultiple(List<dynamic> messages) async {
    try {
      if (messages.isEmpty) return false;
      final batch = db.batch();

      for (final raw in messages) {
        if (raw is! Map) continue;
        final message = Map<String, dynamic>.from(raw);
        final rawId = message['id'];
        final chatUUID = message['chatUUID'] as String?;
        final senderUUID = message['senderUUID'] as String?;
        final createdAt =
            message['created_at'] ??
            message['createdAt'] ??
            DateTime.now().toIso8601String();

        if (rawId == null || chatUUID == null || senderUUID == null) continue;
        final id = _parseId(rawId);
        final subID = message['subID'] is num
            ? (message['subID'] as num).toInt()
            : int.tryParse(message['subID']?.toString() ?? '0') ?? 0;

        final replyTo = message['replyTo'] is Map
            ? Map<String, dynamic>.from(message['replyTo'] as Map)
            : null;

        batch.rawInsert(
          '''
          INSERT OR IGNORE INTO message (
            id, chatUUID, subID, senderUUID, content, type, system_action, created_at,
            replyTo_chatUUID, replyTo_subID, replyTo_messageID, replyTo_rangeStart, replyTo_rangeEnd
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          ''',
          [
            id,
            chatUUID,
            subID,
            senderUUID,
            message['content'],
            message['type'] ?? 'message',
            message['system_action'],
            createdAt,
            replyTo?['chatUUID'],
            replyTo?['subID'] != null ? _parseId(replyTo!['subID']) : null,
            replyTo?['messageID'] != null
                ? _parseId(replyTo!['messageID'])
                : null,
            replyTo?['rangeStart'],
            replyTo?['rangeEnd'],
          ],
        );

        if (message['edited'] == true) {
          batch.rawInsert(
            '''
            INSERT OR IGNORE INTO edited_message (chatUUID, subID, messageID)
            VALUES (?, ?, ?);
            ''',
            [chatUUID, subID, id],
          );
        }

        if (message['replyTos'] is List) {
          for (final reply in message['replyTos'] as List) {
            if (reply is! Map) continue;
            final r = Map<String, dynamic>.from(reply);
            batch.rawInsert(
              '''
              INSERT OR IGNORE INTO message_reply (
                chatUUID, subID, messageID,
                replyTo_chatUUID, replyTo_subID, replyTo_messageID, replyTo_rangeStart, replyTo_rangeEnd
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
              ''',
              [
                chatUUID,
                subID,
                id,
                r['chatUUID'] ?? r['replyTo_chatUUID'],
                r['subID'] != null
                    ? _parseId(r['subID'])
                    : _parseId(r['replyTo_subID']),
                r['messageID'] != null
                    ? _parseId(r['messageID'])
                    : _parseId(r['replyTo_messageID']),
                r['rangeStart'] ?? r['replyTo_rangeStart'],
                r['rangeEnd'] ?? r['replyTo_rangeEnd'],
              ],
            );
          }
        }

        if (message['reactions'] is List) {
          for (final reactionRaw in message['reactions'] as List) {
            if (reactionRaw is! Map) continue;
            final r = Map<String, dynamic>.from(reactionRaw);
            final userUUID = r['userUUID'] as String?;
            final emoji = (r['reaction'] ?? r['emoji']) as String?;
            final at =
                (r['at'] ?? r['created_at'] ?? DateTime.now().toIso8601String())
                    as String;
            if (userUUID != null && emoji != null) {
              batch.rawInsert(
                '''
                INSERT OR IGNORE INTO reaction_message (chatUUID, subID, messageID, userUUID, reaction, at)
                VALUES (?, ?, ?, ?, ?, ?);
                ''',
                [chatUUID, subID, id, userUUID, emoji, at],
              );
            }
          }
        }

        final rawReads =
            message['reads'] ?? message['readBy'] ?? message['message_reads'];
        if (rawReads is List) {
          for (final readRaw in rawReads) {
            if (readRaw is! Map) continue;
            final r = Map<String, dynamic>.from(readRaw);
            final userUUID = (r['userUUID'] ?? r['user_uuid']) as String?;
            final readAt =
                (r['readAt'] ??
                        r['read_at'] ??
                        DateTime.now().toIso8601String())
                    as String;
            if (userUUID != null) {
              batch.rawInsert(
                '''
                INSERT OR IGNORE INTO message_read (chat_uuid, sub_id, message_id, user_uuid, read_at)
                VALUES (?, ?, ?, ?, ?);
                ''',
                [chatUUID, subID, id, userUUID, readAt],
              );
            }
          }
        }

        if (message['files'] is List) {
          for (final fileRaw in message['files'] as List) {
            if (fileRaw is! Map) continue;
            final file = Map<String, dynamic>.from(fileRaw);
            final fileUUID = file['uuid'] as String?;
            final name = file['name'] as String?;
            final mimeType = file['mimeType'] as String?;
            final size = file['size'] is num
                ? (file['size'] as num).toInt()
                : 0;

            if (fileUUID != null && name != null && mimeType != null) {
              final waveformStr = file['waveform'] != null
                  ? (file['waveform'] is String
                        ? file['waveform']
                        : jsonEncode(file['waveform']))
                  : null;

              batch.rawInsert(
                '''
                INSERT OR IGNORE INTO file (uuid, name, ref, mimeType, size, waveform, duration)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                ''',
                [
                  fileUUID,
                  name,
                  file['ref'],
                  mimeType,
                  size,
                  waveformStr,
                  file['duration'] ?? 0,
                ],
              );

              batch.rawInsert(
                '''
                INSERT OR IGNORE INTO message_files (chatUUID, subID, messageID, fileUUID)
                VALUES (?, ?, ?, ?);
                ''',
                [chatUUID, subID, id, fileUUID],
              );
            }
          }
        }
      }

      await batch.commit(noResult: true);
      return true;
    } catch (e) {
      debugPrint('Error adding multiple messages: $e');
      return false;
    }
  }

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

  /// Edits a message content and records it in edited_message table.
  Future<bool> edit(
    String chatUUID,
    int subID,
    dynamic messageID,
    String content,
  ) async {
    try {
      final id = _parseId(messageID);
      await db.rawUpdate(
        'UPDATE message SET content = ? WHERE chatUUID = ? AND subID = ? AND id = ?;',
        [content, chatUUID, subID, id],
      );
      await db.rawInsert(
        'INSERT OR IGNORE INTO edited_message (chatUUID, subID, messageID) VALUES (?, ?, ?);',
        [chatUUID, subID, id],
      );
      return true;
    } catch (e) {
      debugPrint('Error editing message: $e');
      return false;
    }
  }

  /// Deletes a message from the database.
  Future<bool> delete(String chatUUID, int subID, dynamic messageID) async {
    try {
      final id = _parseId(messageID);
      await db.rawDelete(
        'DELETE FROM message WHERE chatUUID = ? AND subID = ? AND id = ?;',
        [chatUUID, subID, id],
      );
      return true;
    } catch (e) {
      debugPrint('Error deleting message: $e');
      return false;
    }
  }

  //  Info Enrichment Helpers

  Future<void> addInfos(Map<String, dynamic> message) async {
    await _addReplyTos(message);
    await _addRepliedFroms(message);
    await _addReactions(message);
    await _addReads(message);
    await _addFiles(message);
  }

  Future<void> _addReads(Map<String, dynamic> message) async {
    final chatUUID = message['chatUUID'] as String?;
    final subID = _parseId(message['subID']);
    final id = _parseId(message['id']);

    final rows = await db.rawQuery(
      'SELECT user_uuid, read_at FROM message_read WHERE chat_uuid = ? AND sub_id = ? AND message_id = ?;',
      [chatUUID, subID, id],
    );

    message['readBy'] = rows
        .map((r) => {'userUUID': r['user_uuid'], 'readAt': r['read_at']})
        .toList();
  }

  Future<void> _addReplyTos(Map<String, dynamic> message) async {
    final chatUUID = message['chatUUID'] as String?;
    final subID = _parseId(message['subID']);
    final id = _parseId(message['id']);

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
    final chatUUID = message['chatUUID'] as String?;
    final subID = _parseId(message['subID']);
    final id = _parseId(message['id']);

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
    final chatUUID = message['chatUUID'] as String?;
    final subID = _parseId(message['subID']);
    final id = _parseId(message['id']);

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
    final chatUUID = message['chatUUID'] as String?;
    final subID = _parseId(message['subID']);
    final id = _parseId(message['id']);

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
}

class MessageGetRepository {
  final MessageRepository _repo;
  MessageGetRepository(this._repo);

  late final MessageGetByRepository by = MessageGetByRepository(_repo);
}

class MessageGetByRepository {
  final MessageRepository _repo;
  MessageGetByRepository(this._repo);

  Future<Map<String, dynamic>?> id(
    String chatUUID,
    int subID,
    dynamic messageID,
  ) async {
    try {
      final parsedId = MessageRepository._parseId(messageID);
      final rows = await _repo.db.rawQuery(
        '''
        SELECT m.*, u.name as sender_name, u.profilePictureUUID as profile_picture_uuid
        FROM message m
        JOIN user u ON m.senderUUID = u.uuid
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
        JOIN user u ON m.senderUUID = u.uuid
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
}

class MessagePinRepository {
  final MessageRepository _repo;
  MessagePinRepository(this._repo);

  Future<bool> add(
    String chatUUID,
    int subID,
    dynamic messageID, [
    String? pinnedAt,
    String? pinnedBy,
  ]) async {
    try {
      final id = MessageRepository._parseId(messageID);
      await _repo.db.rawInsert(
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

  Future<bool> remove(String chatUUID, int subID, dynamic messageID) async {
    try {
      final id = MessageRepository._parseId(messageID);
      await _repo.db.rawDelete(
        'DELETE FROM pinned_message WHERE chatUUID = ? AND subID = ? AND messageID = ?;',
        [chatUUID, subID, id],
      );
      return true;
    } catch (e) {
      debugPrint('Error unpinning message: $e');
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> get(String chatUUID) async {
    try {
      final rows = await _repo.db.rawQuery(
        'SELECT subID, messageID, pinned_at, pinned_by FROM pinned_message WHERE chatUUID = ?;',
        [chatUUID],
      );
      return rows.map((r) => Map<String, dynamic>.from(r)).toList();
    } catch (e) {
      debugPrint('Error retrieving pinned messages: $e');
      return [];
    }
  }
}

class MessageLastRepository {
  final MessageRepository _repo;
  MessageLastRepository(this._repo);

  Future<List<Map<String, dynamic>>> get(String chatUUID) async {
    try {
      final rows = await _repo.db.rawQuery(
        '''
        SELECT m.*, u.name as sender_name, u.profilePictureUUID as profile_picture_uuid
        FROM message m
        JOIN user u ON m.senderUUID = u.uuid
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

  Future<List<Map<String, dynamic>>> getBySub(String chatUUID) async {
    try {
      final rows = await _repo.db.rawQuery(
        '''
        SELECT m.*, u.name as sender_name, u.profilePictureUUID as profile_picture_uuid
        FROM message m
        JOIN user u ON m.senderUUID = u.uuid
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

class MessageReactionRepository {
  final MessageRepository _repo;
  MessageReactionRepository(this._repo);

  Future<bool> add(
    String chatUUID,
    int subID,
    dynamic messageID,
    String emoji,
    String at,
    String userUUID,
  ) async {
    try {
      final id = MessageRepository._parseId(messageID);
      await _repo.db.rawInsert(
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

  Future<bool> remove(
    String chatUUID,
    int subID,
    dynamic messageID,
    String emoji,
    String userUUID,
  ) async {
    try {
      final id = MessageRepository._parseId(messageID);
      await _repo.db.rawDelete(
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

class MessageReadRepository {
  final MessageRepository _repo;
  MessageReadRepository(this._repo);

  Future<bool> add(
    String chatUUID,
    int subID,
    dynamic messageID,
    String userUUID,
    String readAt,
  ) async {
    try {
      final id = MessageRepository._parseId(messageID);
      await _repo.db.rawInsert(
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
