import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:sqflite/sqflite.dart';
import 'package:novyse/core/storage/database/repositories/message/helpers/message_field_parser.dart';

/// Handles insert, update, batch insert, and delete operations for messages.
class MessageMutations {
  final DatabaseExecutor Function() _getDb;

  MessageMutations(this._getDb);

  DatabaseExecutor get db => _getDb();

  /// Adds a single message and its associated replies, files, reads, and reactions.
  Future<bool> add(Map<String, dynamic> message) async {
    try {
      final rawId = message['id'] ?? message['messageID'];
      final chatUUID = MessageFieldParser.parseChatUUID(message);
      final senderUUID = MessageFieldParser.parseSenderUUID(message);
      final createdAt = MessageFieldParser.parseCreatedAtString(message);

      if (rawId == null || chatUUID == null || senderUUID == null) {
        debugPrint(
          'Missing required message fields: id=$rawId, chatUUID=$chatUUID, senderUUID=$senderUUID',
        );
        return false;
      }

      final id = MessageFieldParser.parseId(rawId);
      final subID = MessageFieldParser.parseSubID(message['subID']);

      final replyTo = message['replyTo'] is Map
          ? Map<String, dynamic>.from(message['replyTo'] as Map)
          : null;

      await db.execute(
        '''
        INSERT INTO message (
          id, chatUUID, subID, senderUUID, content, type, system_action, created_at,
          replyTo_chatUUID, replyTo_subID, replyTo_messageID, replyTo_rangeStart, replyTo_rangeEnd
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(chatUUID, subID, id) DO UPDATE SET
          content = excluded.content,
          type = excluded.type,
          system_action = excluded.system_action,
          created_at = excluded.created_at;
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
          replyTo?['subID'] != null
              ? MessageFieldParser.parseId(replyTo!['subID'])
              : null,
          replyTo?['messageID'] != null
              ? MessageFieldParser.parseId(replyTo!['messageID'])
              : null,
          replyTo?['rangeStart'],
          replyTo?['rangeEnd'],
        ],
      );

      if (MessageFieldParser.isEdited(message)) {
        await db.execute(
          '''
          INSERT OR IGNORE INTO edited_message (chatUUID, subID, messageID)
          VALUES (?, ?, ?);
          ''',
          [chatUUID, subID, id],
        );
      }

      if (MessageFieldParser.isPinned(message)) {
        await db.execute(
          '''
          INSERT OR IGNORE INTO pinned_message (chatUUID, subID, messageID, pinned_at, pinned_by)
          VALUES (?, ?, ?, ?, ?);
          ''',
          [chatUUID, subID, id, DateTime.now().toIso8601String(), ''],
        );
      }

      // ReplyTos
      if (message['replyTos'] is List) {
        for (final reply in message['replyTos'] as List) {
          if (reply is! Map) continue;
          final r = Map<String, dynamic>.from(reply);
          await db.execute(
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
                  ? MessageFieldParser.parseId(r['subID'])
                  : MessageFieldParser.parseId(r['replyTo_subID']),
              r['messageID'] != null
                  ? MessageFieldParser.parseId(r['messageID'])
                  : MessageFieldParser.parseId(r['replyTo_messageID']),
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

            await db.execute(
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

            await db.execute(
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
            await db.execute(
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
          final userUUID = (r['userUUID'] ?? r['user_uuid']) as String?;
          final emoji = (r['reaction'] ?? r['emoji']) as String?;
          final at =
              (r['at'] ?? r['created_at'] ?? DateTime.now().toIso8601String())
                  as String;
          if (userUUID != null && emoji != null) {
            await db.execute(
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

  /// Adds multiple messages to the database sequentially.
  Future<bool> addMultiple(List<dynamic> messages) async {
    try {
      if (messages.isEmpty) return false;

      for (final raw in messages) {
        if (raw is! Map) continue;
        final message = Map<String, dynamic>.from(raw);
        final rawId = message['id'] ?? message['messageID'];
        final chatUUID = MessageFieldParser.parseChatUUID(message);
        final senderUUID = MessageFieldParser.parseSenderUUID(message);
        final createdAt = MessageFieldParser.parseCreatedAtString(message);

        if (rawId == null || chatUUID == null || senderUUID == null) continue;
        final id = MessageFieldParser.parseId(rawId);
        final subID = MessageFieldParser.parseSubID(message['subID']);

        final replyTo = message['replyTo'] is Map
            ? Map<String, dynamic>.from(message['replyTo'] as Map)
            : null;

        await db.execute(
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
            replyTo?['subID'] != null
                ? MessageFieldParser.parseId(replyTo!['subID'])
                : null,
            replyTo?['messageID'] != null
                ? MessageFieldParser.parseId(replyTo!['messageID'])
                : null,
            replyTo?['rangeStart'],
            replyTo?['rangeEnd'],
          ],
        );

        if (MessageFieldParser.isEdited(message)) {
          await db.execute(
            '''
            INSERT OR IGNORE INTO edited_message (chatUUID, subID, messageID)
            VALUES (?, ?, ?);
            ''',
            [chatUUID, subID, id],
          );
        }

        if (MessageFieldParser.isPinned(message)) {
          await db.execute(
            '''
            INSERT OR IGNORE INTO pinned_message (chatUUID, subID, messageID, pinned_at, pinned_by)
            VALUES (?, ?, ?, ?, ?);
            ''',
            [chatUUID, subID, id, DateTime.now().toIso8601String(), ''],
          );
        }

        if (message['replyTos'] is List) {
          for (final reply in message['replyTos'] as List) {
            if (reply is! Map) continue;
            final r = Map<String, dynamic>.from(reply);
            await db.execute(
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
                    ? MessageFieldParser.parseId(r['subID'])
                    : MessageFieldParser.parseId(r['replyTo_subID']),
                r['messageID'] != null
                    ? MessageFieldParser.parseId(r['messageID'])
                    : MessageFieldParser.parseId(r['replyTo_messageID']),
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
            final userUUID = (r['userUUID'] ?? r['user_uuid']) as String?;
            final emoji = (r['reaction'] ?? r['emoji']) as String?;
            final at =
                (r['at'] ?? r['created_at'] ?? DateTime.now().toIso8601String())
                    as String;
            if (userUUID != null && emoji != null) {
              await db.execute(
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
              await db.execute(
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

              await db.execute(
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

              await db.execute(
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

      return true;
    } catch (e) {
      debugPrint('Error adding multiple messages: $e');
      return false;
    }
  }

  /// Edits a message content and/or file associations, recording it in edited_message.
  Future<bool> edit(
    String chatUUID,
    int subID,
    dynamic messageID,
    String? content, {
    List<dynamic>? files,
  }) async {
    try {
      final id = MessageFieldParser.parseId(messageID);
      if (content != null) {
        await db.execute(
          'UPDATE message SET content = ? WHERE chatUUID = ? AND subID = ? AND id = ?;',
          [content, chatUUID, subID, id],
        );
      }
      await db.execute(
        'INSERT OR IGNORE INTO edited_message (chatUUID, subID, messageID) VALUES (?, ?, ?);',
        [chatUUID, subID, id],
      );

      if (files != null) {
        final currentRows = await db.rawQuery(
          'SELECT fileUUID FROM message_files WHERE chatUUID = ? AND subID = ? AND messageID = ?;',
          [chatUUID, subID, id],
        );
        final currentUUIDs = currentRows
            .map((r) => r['fileUUID'] as String?)
            .whereType<String>()
            .toSet();

        final incomingUUIDs = <String>{};

        for (final fileRaw in files) {
          if (fileRaw is! Map) continue;
          final file = Map<String, dynamic>.from(fileRaw);
          final fileUUID = file['uuid'] as String?;
          if (fileUUID == null) continue;
          incomingUUIDs.add(fileUUID);

          // Add or update file association with the message
          final name = file['name'] as String?;
          final mimeType = (file['mimeType'] ?? file['mime_type']) as String?;
          final size = file['size'] is num ? (file['size'] as num).toInt() : 0;
          final fileRef =
              (file['ref'] ?? file['uri'] ?? file['path']) as String?;
          final waveformStr = file['waveform'] != null
              ? (file['waveform'] is String
                    ? file['waveform']
                    : jsonEncode(file['waveform']))
              : null;

          await db.execute(
            '''
            INSERT INTO file (uuid, name, ref, mimeType, size, waveform, duration)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(uuid) DO UPDATE SET
              ref = COALESCE(excluded.ref, file.ref),
              name = COALESCE(excluded.name, file.name),
              mimeType = COALESCE(excluded.mimeType, file.mimeType),
              size = CASE WHEN excluded.size > 0 THEN excluded.size ELSE file.size END,
              waveform = COALESCE(excluded.waveform, file.waveform),
              duration = CASE WHEN excluded.duration > 0 THEN excluded.duration ELSE file.duration END;
            ''',
            [
              fileUUID,
              name ?? 'file',
              fileRef,
              mimeType ?? 'application/octet-stream',
              size,
              waveformStr,
              file['duration'] ?? 0,
            ],
          );

          if (fileRef != null && fileRef.isNotEmpty) {
            await db.execute('UPDATE file SET ref = ? WHERE uuid = ?;', [
              fileRef,
              fileUUID,
            ]);
          }

          if (!currentUUIDs.contains(fileUUID)) {
            await db.execute(
              '''
              INSERT OR IGNORE INTO message_files (chatUUID, subID, messageID, fileUUID)
              VALUES (?, ?, ?, ?);
              ''',
              [chatUUID, subID, id, fileUUID],
            );
          }
        }

        // Remove files that are in message_files but not in incoming files
        for (final oldUUID in currentUUIDs) {
          if (!incomingUUIDs.contains(oldUUID)) {
            await db.execute(
              'DELETE FROM message_files WHERE chatUUID = ? AND subID = ? AND messageID = ? AND fileUUID = ?;',
              [chatUUID, subID, id, oldUUID],
            );
          }
        }
      }

      return true;
    } catch (e) {
      debugPrint('Error editing message: $e');
      return false;
    }
  }

  /// Deletes a message from the database.
  Future<bool> delete(String chatUUID, int subID, dynamic messageID) async {
    try {
      final id = MessageFieldParser.parseId(messageID);
      await db.execute(
        'DELETE FROM favorite_message WHERE chatUUID = ? AND subID = ? AND messageID = ?;',
        [chatUUID, subID, id],
      );
      await db.execute(
        'DELETE FROM message WHERE chatUUID = ? AND subID = ? AND id = ?;',
        [chatUUID, subID, id],
      );
      return true;
    } catch (e) {
      debugPrint('Error deleting message: $e');
      return false;
    }
  }
}
