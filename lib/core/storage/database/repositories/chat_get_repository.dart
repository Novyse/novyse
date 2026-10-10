import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:sqflite/sqflite.dart';

import 'chat_repository.dart';

class ChatGetRepository {
  final ChatRepository _repo;
  ChatGetRepository(this._repo);

  DatabaseExecutor get _db => _repo.db;

  Future<List<Map<String, dynamic>>> all([String? localUserUUID]) async {
    try {
      final chatRows = await _db.rawQuery('SELECT * FROM chat;');
      final result = <Map<String, dynamic>>[];

      for (final rawChat in chatRows) {
        final chat = Map<String, dynamic>.from(rawChat);
        final chatUUID = chat['uuid'] as String;

        if (localUserUUID != null && localUserUUID.isNotEmpty) {
          final countRows = await _db.rawQuery(
            '''
            SELECT COUNT(*) as count FROM message m
            WHERE m.chatUUID = ? AND m.senderUUID != ?
              AND m.id > (
                SELECT COALESCE(MAX(messageID), 0)
                FROM message_read
                WHERE chatUUID = m.chatUUID AND subID = m.subID
                  AND userUUID = ?
              )
              AND m.created_at > (
                SELECT joined_at
                FROM member
                WHERE chatUUID = ? AND userUUID = ?
              );
            ''',
            [chatUUID, localUserUUID, localUserUUID, chatUUID, localUserUUID],
          );
          chat['unreadCount'] = countRows.isNotEmpty
              ? (countRows.first['count'] as num).toInt()
              : 0;

          // Load oldest unread message if it exists
          final oldestRows = await _db.rawQuery(
            '''
            SELECT m.id, m.subID FROM message m
            WHERE m.chatUUID = ? AND m.senderUUID != ?
              AND m.id > (
                SELECT COALESCE(MAX(messageID), 0)
                FROM message_read
                WHERE chatUUID = m.chatUUID AND subID = m.subID
                  AND userUUID = ?
              )
              AND m.created_at > (
                SELECT joined_at
                FROM member
                WHERE chatUUID = ? AND userUUID = ?
              )
            ORDER BY m.created_at ASC
            LIMIT 1;
            ''',
            [chatUUID, localUserUUID, localUserUUID, chatUUID, localUserUUID],
          );

          final initialMessages = <Map<String, dynamic>>[];
          int? oldestId;
          int? oldestSubId;

          if (oldestRows.isNotEmpty && _repo.messageRepository != null) {
            oldestId = (oldestRows.first['id'] as num).toInt();
            oldestSubId = (oldestRows.first['subID'] as num).toInt();
            final oldestUnread = await _repo.messageRepository!.get.by.id(
              chatUUID,
              oldestSubId,
              oldestId,
            );
            if (oldestUnread != null) initialMessages.add(oldestUnread);
          }

          if (_repo.messageRepository != null) {
            final lastArr = await _repo.messageRepository!.last.get(chatUUID);
            if (lastArr.isNotEmpty) {
              final lastMessage = lastArr.first;
              chat['lastMessage'] = lastMessage;
              final lastId = (lastMessage['id'] as num).toInt();
              final lastSubId = (lastMessage['subID'] as num).toInt();
              if (oldestId == null ||
                  lastId != oldestId ||
                  lastSubId != oldestSubId) {
                initialMessages.add(lastMessage);
              }
            }
          }
          chat['messages'] = initialMessages;
        } else {
          chat['unreadCount'] = 0;
          if (_repo.messageRepository != null) {
            final lastArr = await _repo.messageRepository!.last.get(chatUUID);
            chat['messages'] = lastArr;
            chat['lastMessage'] = lastArr.isNotEmpty ? lastArr.first : null;
          } else {
            chat['messages'] = [];
            chat['lastMessage'] = null;
          }
        }

        chat['members'] = await _repo.member.get.by.chatUUID(chatUUID);

        if (_repo.handleRepository != null) {
          chat['handle'] = await _repo.handleRepository!.get.by.uuid(
            'chat',
            chatUUID,
          );
        }

        final subRows = await _db.rawQuery(
          'SELECT * FROM chat_sub WHERE chatUUID = ? ORDER BY id ASC;',
          [chatUUID],
        );
        final subs = subRows.map((r) {
          return Map<String, dynamic>.from(r);
        }).toList();

        if (_repo.messageRepository != null) {
          final subLastMessages = await _repo.messageRepository!.last.getBySub(
            chatUUID,
          );
          final subMsgMap = <int, Map<String, dynamic>>{};
          for (final msg in subLastMessages) {
            final subId = (msg['subID'] as num).toInt();
            subMsgMap[subId] = msg;
          }
          for (final sub in subs) {
            final subId = (sub['id'] as num).toInt();
            sub['lastMessage'] = subMsgMap[subId];
          }
        }
        chat['subs'] = subs;

        final roleRows = await _db.rawQuery(
          'SELECT * FROM role WHERE chatUUID = ? ORDER BY id ASC;',
          [chatUUID],
        );
        chat['roles'] = roleRows.map((r) {
          final role = Map<String, dynamic>.from(r);
          if (role['color'] is String) {
            try {
              role['color'] = jsonDecode(role['color'] as String);
            } catch (_) {}
          }
          return role;
        }).toList();

        final pinnedRows = await _db.rawQuery(
          'SELECT * FROM pinned_message WHERE chatUUID = ? ORDER BY pinned_at ASC;',
          [chatUUID],
        );
        chat['pinnedMessages'] = pinnedRows
            .map((r) => Map<String, dynamic>.from(r))
            .toList();

        final editedRows = await _db.rawQuery(
          'SELECT * FROM edited_message WHERE chatUUID = ?;',
          [chatUUID],
        );
        chat['editedMessages'] = editedRows
            .map((r) => Map<String, dynamic>.from(r))
            .toList();
        chat['deletedMessages'] = [];

        result.add(chat);
      }

      return result;
    } catch (e) {
      debugPrint('Error getting chats: $e');
      return [];
    }
  }
}
