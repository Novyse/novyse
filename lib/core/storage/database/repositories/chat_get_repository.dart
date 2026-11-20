import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:sqflite/sqflite.dart';

import 'chat_repository.dart';

/// Reads the chat list with a bounded number of statements.
///
/// This used to fan out per chat: members, handle, subs, roles, pinned, edited,
/// the unread count, the last message and every enrichment query were separate
/// awaited statements, i.e. roughly 25-35 statements per chat.
///
/// Everything below is keyed on a chunk of chat UUIDs instead, so the whole
/// list costs a handful of statements. The chunk size keeps the `IN (…)` lists
/// under SQLite's default limit of 999 bound variables.
class ChatGetRepository {
  final ChatRepository _repo;
  ChatGetRepository(this._repo);

  DatabaseExecutor get _db => _repo.db;

  static const int _chunkSize = 400;

  Future<List<Map<String, dynamic>>> all([String? localUserUUID]) async {
    try {
      final chatRows = await _db.rawQuery('SELECT * FROM chat;');
      if (chatRows.isEmpty) return <Map<String, dynamic>>[];

      final chats = chatRows
          .map((row) => Map<String, dynamic>.from(row))
          .toList();
      final chatUUIDs = <String>[
        for (final chat in chats) chat['uuid'] as String,
      ];

      final hasMessages = _repo.messageRepository != null;
      final hasHandles = _repo.handleRepository != null;

      final membersByChat = await _loadMembers(chatUUIDs);
      final handlesByChat = hasHandles
          ? await _loadHandles(chatUUIDs)
          : const <String, String?>{};
      final subsByChat = await _loadSubs(chatUUIDs);
      final rolesByChat = await _loadRoles(chatUUIDs);
      final pinnedByChat = await _loadRowsByChat(
        chatUUIDs,
        'SELECT * FROM pinned_message t '
        'WHERE t.chatUUID IN (%IN%) ORDER BY t.pinned_at ASC;',
      );
      final editedByChat = await _loadRowsByChat(
        chatUUIDs,
        'SELECT * FROM edited_message t WHERE t.chatUUID IN (%IN%);',
      );
      final unreadByChat = await _loadUnreadCounts(chatUUIDs, localUserUUID);

      final lastByChat = <String, Map<String, dynamic>>{};
      final lastBySub = <String, Map<int, Map<String, dynamic>>>{};
      if (hasMessages) {
        final lastMessages = await _loadLastMessages(chatUUIDs);
        await _applyPreviewInfos(lastMessages);
        for (final message in lastMessages) {
          final chatUUID = message['chatUUID'] as String;
          final subID = (message['subID'] as num).toInt();
          (lastBySub[chatUUID] ??= <int, Map<String, dynamic>>{})[subID] =
              message;

          final current = lastByChat[chatUUID];
          if (current == null || _isNewer(message, current)) {
            lastByChat[chatUUID] = message;
          }
        }
      }

      final result = <Map<String, dynamic>>[];
      for (final chat in chats) {
        final chatUUID = chat['uuid'] as String;

        chat['unreadCount'] = unreadByChat[chatUUID] ?? 0;
        chat['lastMessage'] = lastByChat[chatUUID];
        chat['members'] = membersByChat[chatUUID] ?? <Map<String, dynamic>>[];
        if (hasHandles) {
          chat['handle'] = handlesByChat[chatUUID];
        }

        final subs = subsByChat[chatUUID] ?? <Map<String, dynamic>>[];
        if (hasMessages) {
          final subLasts =
              lastBySub[chatUUID] ?? const <int, Map<String, dynamic>>{};
          for (final sub in subs) {
            sub['lastMessage'] = subLasts[(sub['id'] as num).toInt()];
          }
        }
        chat['subs'] = subs;
        chat['roles'] = rolesByChat[chatUUID] ?? <Map<String, dynamic>>[];
        chat['pinnedMessages'] =
            pinnedByChat[chatUUID] ?? <Map<String, dynamic>>[];
        chat['editedMessages'] =
            editedByChat[chatUUID] ?? <Map<String, dynamic>>[];
        chat['deletedMessages'] = <Map<String, dynamic>>[];

        result.add(chat);
      }

      return result;
    } catch (e) {
      debugPrint('Error getting chats: $e');
      return <Map<String, dynamic>>[];
    }
  }

  /// Members of every chat, in the same shape [MemberGetByRepository] returns.
  Future<Map<String, List<Map<String, dynamic>>>> _loadMembers(
    List<String> chatUUIDs,
  ) async {
    final rows = await _loadRowsByChat(
      chatUUIDs,
      'SELECT m.chatUUID AS chatUUID, m.userUUID AS uuid, '
      'm.joined_at AS joinedAt, m.role_ids AS roleIds '
      'FROM member m WHERE m.chatUUID IN (%IN%);',
    );

    final members = <String, List<Map<String, dynamic>>>{};
    for (final row in rows.values.expand((list) => list)) {
      var parsedRoleIds = <dynamic>[];
      try {
        final roleIdsRaw = row['roleIds'];
        if (roleIdsRaw is String) {
          parsedRoleIds = jsonDecode(roleIdsRaw) as List? ?? [];
        } else if (roleIdsRaw is List) {
          parsedRoleIds = roleIdsRaw;
        }
      } catch (_) {}
      final chatUUID = row['chatUUID'] as String;
      (members[chatUUID] ??= <Map<String, dynamic>>[]).add({
        'uuid': row['uuid'],
        'roleIDs': parsedRoleIds,
        'action': null,
        'joinedAt': row['joinedAt'],
      });
    }
    return members;
  }

  /// Resolves the chat handle for every chat (the query is not filtered by
  /// handle type, matching the single-row lookup it replaces).
  Future<Map<String, String?>> _loadHandles(List<String> chatUUIDs) async {
    final rows = await _loadRowsByChat(
      chatUUIDs,
      'SELECT t.chatUUID AS chatUUID, t.handle AS handle '
      'FROM handle t WHERE t.chatUUID IN (%IN%);',
    );

    final handles = <String, String?>{};
    for (final row in rows.values.expand((list) => list)) {
      handles.putIfAbsent(
        row['chatUUID'] as String,
        () => row['handle'] as String?,
      );
    }
    return handles;
  }

  Future<Map<String, List<Map<String, dynamic>>>> _loadSubs(
    List<String> chatUUIDs,
  ) {
    return _loadRowsByChat(
      chatUUIDs,
      'SELECT * FROM chat_sub t WHERE t.chatUUID IN (%IN%) ORDER BY t.id ASC;',
    );
  }

  Future<Map<String, List<Map<String, dynamic>>>> _loadRoles(
    List<String> chatUUIDs,
  ) async {
    final rows = await _loadRowsByChat(
      chatUUIDs,
      'SELECT * FROM role t WHERE t.chatUUID IN (%IN%) ORDER BY t.id ASC;',
    );

    for (final role in rows.values.expand((list) => list)) {
      if (role['color'] is String) {
        try {
          role['color'] = jsonDecode(role['color'] as String);
        } catch (_) {}
      }
    }
    return rows;
  }

  /// Unread counts for every chat that has any, in one statement per chunk.
  ///
  /// Replaces the two per-chat queries (the `COUNT(*)` and the "oldest unread"
  /// lookup whose only consumer, `chat['messages']`, was never read back).
  Future<Map<String, int>> _loadUnreadCounts(
    List<String> chatUUIDs,
    String? localUserUUID,
  ) async {
    final unread = <String, int>{};
    if (localUserUUID == null || localUserUUID.isEmpty) return unread;

    for (final chunk in _chunks(chatUUIDs)) {
      final placeholders = _placeholders(chunk.length);
      final rows = await _db.rawQuery(
        '''
        SELECT m.chatUUID AS chatUUID, COUNT(*) AS count
        FROM message m
        INNER JOIN member mem
          ON mem.chatUUID = m.chatUUID AND mem.userUUID = ?
        LEFT JOIN (
          SELECT rd.chatUUID AS chatUUID, rd.subID AS subID,
                 MAX(rd.messageID) AS maxID
          FROM message_read rd
          WHERE rd.userUUID = ? AND rd.chatUUID IN ($placeholders)
          GROUP BY rd.chatUUID, rd.subID
        ) read ON read.chatUUID = m.chatUUID AND read.subID = m.subID
        WHERE m.chatUUID IN ($placeholders)
          AND m.senderUUID != ?
          AND m.id > COALESCE(read.maxID, 0)
          AND m.created_at > mem.joined_at
        GROUP BY m.chatUUID;
        ''',
        [localUserUUID, localUserUUID, ...chunk, ...chunk, localUserUUID],
      );

      for (final row in rows) {
        unread[row['chatUUID'] as String] = (row['count'] as num).toInt();
      }
    }
    return unread;
  }

  /// Latest message of every (chat, sub) pair, in one statement per chunk.
  ///
  /// The latest message of a chat is the latest of its subs, so this single
  /// statement serves both `chat.lastMessage` and `subs[].lastMessage`.
  Future<List<Map<String, dynamic>>> _loadLastMessages(
    List<String> chatUUIDs,
  ) async {
    final latest = <String, Map<String, dynamic>>{};

    for (final chunk in _chunks(chatUUIDs)) {
      final placeholders = _placeholders(chunk.length);
      final rows = await _db.rawQuery(
        '''
        SELECT m.*, u.name AS sender_name,
               u.profilePictureUUID AS profile_picture_uuid
        FROM message m
        LEFT JOIN user u ON m.senderUUID = u.uuid
        INNER JOIN (
          SELECT chatUUID, subID, MAX(created_at) AS max_time
          FROM message
          WHERE chatUUID IN ($placeholders)
          GROUP BY chatUUID, subID
        ) last
          ON m.chatUUID = last.chatUUID
         AND m.subID = last.subID
         AND m.created_at = last.max_time
        WHERE m.chatUUID IN ($placeholders);
        ''',
        [...chunk, ...chunk],
      );

      for (final row in rows) {
        final message = Map<String, dynamic>.from(row);
        final key = _messageKey(message);
        final current = latest[key];
        if (current == null || _isNewer(message, current)) {
          latest[key] = message;
        }
      }
    }
    return latest.values.toList();
  }

  /// Fills the keys the chat list reads on the preview message.
  ///
  /// `ChatModel`, `ChatListItem` and `formatMessage` only consume `content`,
  /// `type`, `createdAt`, the sender and `files`. `edited`/`pinned` are kept
  /// truthful because they are plain existence checks, while read receipts,
  /// reactions, replies and the favorite flag are not rendered by the list and
  /// are returned empty instead of costing a query per message. Note that
  /// `reads` is the one enrichment that could not be batched cheaply: it is a
  /// `messageID >= ?` range, not an equality lookup.
  Future<void> _applyPreviewInfos(List<Map<String, dynamic>> messages) async {
    if (messages.isEmpty) return;

    final chatUUIDs = <String>{};
    final subIDs = <int>{};
    final messageIDs = <int>{};
    for (final message in messages) {
      chatUUIDs.add(message['chatUUID'] as String);
      subIDs.add((message['subID'] as num).toInt());
      messageIDs.add((message['id'] as num).toInt());
    }

    final filesByMessage = <String, List<Map<String, dynamic>>>{};
    final fileRows = await _loadRowsByMessage(
      chatUUIDs.toList(),
      subIDs.toList(),
      messageIDs.toList(),
      'SELECT t.chatUUID AS chatUUID, t.subID AS subID, '
      't.messageID AS messageID, f.* '
      'FROM message_files t JOIN file f ON f.uuid = t.fileUUID',
    );
    for (final row in fileRows) {
      final file = Map<String, dynamic>.from(row)
        ..remove('chatUUID')
        ..remove('subID')
        ..remove('messageID');
      if (file['waveform'] is String) {
        try {
          file['waveform'] = jsonDecode(file['waveform'] as String);
        } catch (_) {}
      }
      final key = _messageKey(row);
      (filesByMessage[key] ??= <Map<String, dynamic>>[]).add(file);
    }

    final edited = await _loadMessageKeySet(
      chatUUIDs.toList(),
      subIDs.toList(),
      messageIDs.toList(),
      'edited_message',
    );
    final pinned = await _loadMessageKeySet(
      chatUUIDs.toList(),
      subIDs.toList(),
      messageIDs.toList(),
      'pinned_message',
    );

    for (final message in messages) {
      final key = _messageKey(message);
      message['files'] = filesByMessage[key] ?? <Map<String, dynamic>>[];
      message['edited'] = edited.contains(key);
      message['pinned'] = pinned.contains(key);
      message['reactions'] = <Map<String, dynamic>>[];
      message['reads'] = <Map<String, dynamic>>[];
      message['replyTos'] = <Map<String, dynamic>>[];
      message['repliedFroms'] = <Map<String, dynamic>>[];
      message['favorited'] = false;
    }
  }

  Future<Set<String>> _loadMessageKeySet(
    List<String> chatUUIDs,
    List<int> subIDs,
    List<int> messageIDs,
    String table,
  ) async {
    final rows = await _loadRowsByMessage(
      chatUUIDs,
      subIDs,
      messageIDs,
      'SELECT t.chatUUID AS chatUUID, t.subID AS subID, '
      't.messageID AS messageID FROM $table t',
    );
    return {for (final row in rows) _messageKey(row)};
  }

  /// Runs [selectFrom] (whose table must be aliased as `t`) filtered by the
  /// given chat/sub/message keys.
  ///
  /// The three `IN` lists are matched independently, which over-selects a small
  /// cross product when several chats share message ids; the exact triple is
  /// filtered by the caller through [_messageKey].
  Future<List<Map<String, dynamic>>> _loadRowsByMessage(
    List<String> chatUUIDs,
    List<int> subIDs,
    List<int> messageIDs,
    String selectFrom,
  ) async {
    final rows = <Map<String, dynamic>>[];
    if (chatUUIDs.isEmpty || subIDs.isEmpty || messageIDs.isEmpty) return rows;

    for (final chatChunk in _chunks(chatUUIDs)) {
      for (final subChunk in _chunks(subIDs)) {
        for (final idChunk in _chunks(messageIDs)) {
          final result = await _db.rawQuery(
            '$selectFrom WHERE t.chatUUID IN (${_placeholders(chatChunk.length)}) '
            'AND t.subID IN (${_placeholders(subChunk.length)}) '
            'AND t.messageID IN (${_placeholders(idChunk.length)});',
            [...chatChunk, ...subChunk, ...idChunk],
          );
          rows.addAll(result.map((row) => Map<String, dynamic>.from(row)));
        }
      }
    }
    return rows;
  }

  /// Runs [sqlTemplate] once per chunk of chats and groups the rows by the
  /// `chatUUID` column. The template must contain `%IN%` for the placeholders.
  Future<Map<String, List<Map<String, dynamic>>>> _loadRowsByChat(
    List<String> chatUUIDs,
    String sqlTemplate,
  ) async {
    final grouped = <String, List<Map<String, dynamic>>>{};
    for (final chunk in _chunks(chatUUIDs)) {
      final rows = await _db.rawQuery(
        sqlTemplate.replaceAll('%IN%', _placeholders(chunk.length)),
        chunk,
      );
      for (final row in rows) {
        final map = Map<String, dynamic>.from(row);
        (grouped[map['chatUUID'] as String] ??= <Map<String, dynamic>>[]).add(
          map,
        );
      }
    }
    return grouped;
  }

  /// `true` when [candidate] is the more recent of the two messages. Messages
  /// sharing a timestamp are ordered by id, so the result is deterministic.
  bool _isNewer(Map<String, dynamic> candidate, Map<String, dynamic> current) {
    final candidateTime = candidate['created_at']?.toString() ?? '';
    final currentTime = current['created_at']?.toString() ?? '';
    final byTime = candidateTime.compareTo(currentTime);
    if (byTime != 0) return byTime > 0;
    final candidateId = (candidate['id'] as num?)?.toInt() ?? 0;
    final currentId = (current['id'] as num?)?.toInt() ?? 0;
    return candidateId > currentId;
  }

  /// Identity of a message row. Accepts both a `message` row (`id`) and a
  /// junction row from `message_files`/`edited_message`/`pinned_message`
  /// (`messageID`).
  String _messageKey(Map<String, dynamic> row) =>
      '${row['chatUUID']}/${row['subID']}/${row['id'] ?? row['messageID']}';
  Iterable<List<T>> _chunks<T>(List<T> values) sync* {
    for (var start = 0; start < values.length; start += _chunkSize) {
      final end = start + _chunkSize;
      yield values.sublist(start, end > values.length ? values.length : end);
    }
  }

  String _placeholders(int count) => List.filled(count, '?').join(', ');
}
