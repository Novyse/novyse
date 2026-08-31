import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:sqflite/sqflite.dart';
import 'package:novyse/core/storage/database/repositories/handle_repository.dart';
import 'package:novyse/core/storage/database/repositories/message_repository.dart';

class MemberRepository {
  DatabaseExecutor? _db;

  MemberRepository([this._db]);

  void setDb(DatabaseExecutor db) {
    _db = db;
  }

  DatabaseExecutor get db {
    final database = _db;
    if (database == null) {
      throw StateError('MemberRepository: database is not set or initialized.');
    }
    return database;
  }

  late final MemberGetRepository get = MemberGetRepository(this);

  Future<bool> add(String chatUUID, dynamic user) async {
    try {
      final userUUID = user is String
          ? user
          : (user is Map
                ? (user['uuid'] ?? user['userUUID']) as String?
                : null);

      if (chatUUID.isEmpty || userUUID == null || userUUID.isEmpty) {
        debugPrint(
          'Missing required fields to add member: chatUUID=$chatUUID, user=$user',
        );
        return false;
      }

      final roles = user is Map ? (user['roleIDs'] ?? user['roles'] ?? []) : [];
      final joinedAt = user is Map
          ? (user['joinedAt'] ??
                user['joined_at'] ??
                DateTime.now().toIso8601String())
          : DateTime.now().toIso8601String();

      await db.execute(
        '''
        INSERT OR IGNORE INTO member (userUUID, chatUUID, role_ids, joined_at)
        VALUES (?, ?, ?, ?);
        ''',
        [userUUID, chatUUID, jsonEncode(roles), joinedAt],
      );
      return true;
    } catch (e) {
      debugPrint('Error adding member to chat: $e');
      return false;
    }
  }

  Future<bool> addMultiple(List<dynamic> members) async {
    try {
      if (members.isEmpty) return false;

      for (final m in members) {
        if (m is! Map) continue;
        final chatUUID = m['chatUUID'] as String?;
        final u = m['user'];
        final userUUID = u is String
            ? u
            : (u is Map ? (u['uuid'] ?? u['userUUID']) as String? : null);

        if (chatUUID == null || userUUID == null) continue;

        final roles = u is Map ? (u['roleIDs'] ?? u['roles'] ?? []) : [];
        final joinedAt = u is Map
            ? (u['joinedAt'] ??
                  u['joined_at'] ??
                  DateTime.now().toIso8601String())
            : DateTime.now().toIso8601String();

        await db.execute(
          '''
          INSERT OR IGNORE INTO member (userUUID, chatUUID, role_ids, joined_at)
          VALUES (?, ?, ?, ?);
          ''',
          [userUUID, chatUUID, jsonEncode(roles), joinedAt],
        );
      }

      return true;
    } catch (e) {
      debugPrint('Error adding multiple members: $e');
      return false;
    }
  }

  Future<bool> remove(String chatUUID, dynamic user) async {
    try {
      final userUUID = user is String
          ? user
          : (user is Map
                ? (user['uuid'] ?? user['userUUID']) as String?
                : null);

      if (chatUUID.isEmpty || userUUID == null || userUUID.isEmpty) {
        debugPrint(
          'Missing required fields to remove member: chatUUID=$chatUUID, user=$user',
        );
        return false;
      }

      await db.execute(
        'DELETE FROM member WHERE userUUID = ? AND chatUUID = ?;',
        [userUUID, chatUUID],
      );
      return true;
    } catch (e) {
      debugPrint('Error removing member from chat: $e');
      return false;
    }
  }
}

class MemberGetRepository {
  final MemberRepository _repo;
  MemberGetRepository(this._repo);

  late final MemberGetByRepository by = MemberGetByRepository(_repo);
}

class MemberGetByRepository {
  final MemberRepository _repo;
  MemberGetByRepository(this._repo);

  Future<List<Map<String, dynamic>>> chatUUID(String chatUUID) async {
    try {
      if (chatUUID.isEmpty) return [];

      final rows = await _repo.db.rawQuery(
        '''
        SELECT m.userUUID as uuid, m.joined_at as joinedAt, m.role_ids as roleIds
        FROM member m
        WHERE m.chatUUID = ?;
        ''',
        [chatUUID],
      );

      return rows.map((m) {
        var parsedRoleIds = [];
        try {
          final roleIdsRaw = m['roleIds'];
          if (roleIdsRaw is String) {
            parsedRoleIds = jsonDecode(roleIdsRaw) as List? ?? [];
          } else if (roleIdsRaw is List) {
            parsedRoleIds = roleIdsRaw;
          }
        } catch (_) {}

        return {
          'uuid': m['uuid'],
          'roleIDs': parsedRoleIds,
          'action': null,
          'joinedAt': m['joinedAt'],
        };
      }).toList();
    } catch (e) {
      debugPrint('Error retrieving members by chat UUID: $e');
      return [];
    }
  }
}

class ChatRepository {
  DatabaseExecutor? _db;
  late final MemberRepository member;
  MessageRepository? _messageRepository;
  HandleRepository? _handleRepository;

  ChatRepository([this._db, this._messageRepository, this._handleRepository]) {
    member = MemberRepository(_db);
    pin = ChatPinRepository(this);
    sub = ChatSubRepository(this);
    get = ChatGetRepository(this);
  }

  void setDb(DatabaseExecutor db) {
    _db = db;
    member.setDb(db);
  }

  void setRepositories(
    MessageRepository messageRepo,
    HandleRepository handleRepo,
  ) {
    _messageRepository = messageRepo;
    _handleRepository = handleRepo;
  }

  DatabaseExecutor get db {
    final database = _db;
    if (database == null) {
      throw StateError('ChatRepository: database is not set or initialized.');
    }
    return database;
  }

  late final ChatPinRepository pin;
  late final ChatSubRepository sub;
  late final ChatGetRepository get;

  /// Adds a single chat to the database with roles, subs, members, handle, and pins.
  Future<bool> add(Map<String, dynamic> chat) async {
    try {
      final uuid = chat['uuid'] as String?;
      final type = chat['type'] as String?;
      final rawMembers = chat['members'];
      final members = rawMembers is List ? rawMembers : [];

      if (uuid == null || type == null) {
        debugPrint('Missing required chat fields: uuid=$uuid, type=$type');
        return false;
      }

      await db.execute(
        '''
        INSERT OR IGNORE INTO chat (uuid, type, name, description, profilePictureUUID, eventID)
        VALUES (?, ?, ?, ?, ?, ?);
        ''',
        [
          uuid,
          type,
          chat['name'],
          chat['description'],
          chat['profilePictureUUID'] ?? chat['pictureUUID'],
          chat['eventID'] ?? 0,
        ],
      );

      final handle = chat['handle'] as String?;
      if (handle != null && handle.isNotEmpty) {
        await db.execute(
          '''
          INSERT INTO handle (chatUUID, type, handle) VALUES (?, 'CHAT', ?)
          ON CONFLICT(handle) DO UPDATE SET chatUUID = excluded.chatUUID;
          ''',
          [uuid, handle],
        );
      }

      for (final m in members) {
        await member.add(uuid, m);
      }

      if (chat['roles'] is List) {
        for (final roleRaw in chat['roles'] as List) {
          if (roleRaw is! Map) continue;
          final role = Map<String, dynamic>.from(roleRaw);
          final colorVal = role['color'] != null
              ? (role['color'] is String
                    ? role['color']
                    : jsonEncode(role['color']))
              : null;
          final roleId = role['id'] is num ? (role['id'] as num).toInt() : 0;
          await db.execute(
            '''
            INSERT OR IGNORE INTO role (id, chatUUID, name, permission, level, color)
            VALUES (?, ?, ?, ?, ?, ?);
            ''',
            [
              roleId,
              uuid,
              role['name'] ?? '',
              role['permission']?.toString() ?? '0',
              role['level'] ?? 0,
              colorVal,
            ],
          );
        }
      }

      if (chat['subs'] is List) {
        for (final subRaw in chat['subs'] as List) {
          if (subRaw is! Map) continue;
          final s = Map<String, dynamic>.from(subRaw);
          final subId = s['id'] is num ? (s['id'] as num).toInt() : 0;
          await db.execute(
            '''
            INSERT OR IGNORE INTO chat_sub (id, chatUUID, name, type, created_at)
            VALUES (?, ?, ?, ?, ?);
            ''',
            [
              subId,
              uuid,
              s['name'],
              s['type'] ?? 'DEFAULT',
              s['created_at'] ??
                  s['createdAt'] ??
                  DateTime.now().toIso8601String(),
            ],
          );
        }
      }

      if (chat['pinnedMessages'] is List && _messageRepository != null) {
        for (final pinnedMessage in chat['pinnedMessages'] as List) {
          if (pinnedMessage is! Map) continue;
          final p = Map<String, dynamic>.from(pinnedMessage);
          final subId = p['subID'] is num ? (p['subID'] as num).toInt() : 0;
          await _messageRepository!.pin.add(
            uuid,
            subId,
            p['messageID'],
            p['pinnedAt'] as String?,
            p['pinnedBy'] as String?,
          );
        }
      }

      return true;
    } catch (e) {
      debugPrint('Error adding chat: $e');
      return false;
    }
  }

  /// Adds multiple chats sequentially.
  Future<bool> addMultiple(List<dynamic> chats) async {
    try {
      if (chats.isEmpty) return false;

      final allMembers = <Map<String, dynamic>>[];
      final allRoles = <Map<String, dynamic>>[];
      final allSubs = <Map<String, dynamic>>[];
      final allPinnedMessages = <Map<String, dynamic>>[];

      for (final raw in chats) {
        if (raw is! Map) continue;
        final chat = Map<String, dynamic>.from(raw);
        final uuid = chat['uuid'] as String?;
        final type = chat['type'] as String?;

        if (uuid == null || type == null) continue;

        await db.execute(
          '''
          INSERT OR IGNORE INTO chat (uuid, type, name, description, profilePictureUUID, eventID)
          VALUES (?, ?, ?, ?, ?, ?);
          ''',
          [
            uuid,
            type,
            chat['name'],
            chat['description'],
            chat['profilePictureUUID'] ?? chat['pictureUUID'],
            chat['eventID'] ?? 0,
          ],
        );

        final handle = chat['handle'] as String?;
        if (handle != null && handle.isNotEmpty) {
          await db.execute(
            '''
            INSERT INTO handle (chatUUID, type, handle) VALUES (?, 'CHAT', ?)
            ON CONFLICT(handle) DO UPDATE SET chatUUID = excluded.chatUUID;
            ''',
            [uuid, handle],
          );
        }

        if (chat['members'] is List) {
          for (final m in chat['members'] as List) {
            allMembers.add({'chatUUID': uuid, 'user': m});
          }
        }

        if (chat['roles'] is List) {
          for (final r in chat['roles'] as List) {
            if (r is Map) {
              allRoles.add({'chatUUID': uuid, ...Map<String, dynamic>.from(r)});
            }
          }
        }

        if (chat['subs'] is List) {
          for (final s in chat['subs'] as List) {
            if (s is Map) {
              allSubs.add({'chatUUID': uuid, ...Map<String, dynamic>.from(s)});
            }
          }
        }

        if (chat['pinnedMessages'] is List) {
          for (final p in chat['pinnedMessages'] as List) {
            if (p is Map) {
              allPinnedMessages.add({
                'chatUUID': uuid,
                ...Map<String, dynamic>.from(p),
              });
            }
          }
        }
      }

      for (final role in allRoles) {
        final colorVal = role['color'] != null
            ? (role['color'] is String
                  ? role['color']
                  : jsonEncode(role['color']))
            : null;
        final roleId = role['id'] is num ? (role['id'] as num).toInt() : 0;
        await db.execute(
          '''
          INSERT OR IGNORE INTO role (id, chatUUID, name, permission, level, color)
          VALUES (?, ?, ?, ?, ?, ?);
          ''',
          [
            roleId,
            role['chatUUID'],
            role['name'] ?? '',
            role['permission']?.toString() ?? '0',
            role['level'] ?? 0,
            colorVal,
          ],
        );
      }

      for (final sub in allSubs) {
        final subId = sub['id'] is num ? (sub['id'] as num).toInt() : 0;
        await db.execute(
          '''
          INSERT OR IGNORE INTO chat_sub (id, chatUUID, name, type, created_at)
          VALUES (?, ?, ?, ?, ?);
          ''',
          [
            subId,
            sub['chatUUID'],
            sub['name'],
            sub['type'] ?? 'DEFAULT',
            sub['created_at'] ??
                sub['createdAt'] ??
                DateTime.now().toIso8601String(),
          ],
        );
      }

      if (allMembers.isNotEmpty) {
        await member.addMultiple(allMembers);
      }

      if (_messageRepository != null) {
        for (final p in allPinnedMessages) {
          final subId = p['subID'] is num ? (p['subID'] as num).toInt() : 0;
          await _messageRepository!.pin.add(
            p['chatUUID'] as String,
            subId,
            p['messageID'],
            p['pinnedAt'] as String?,
            p['pinnedBy'] as String?,
          );
        }
      }

      return true;
    } catch (e) {
      debugPrint('Error adding multiple chats: $e');
      return false;
    }
  }
}

class ChatPinRepository {
  final ChatRepository _repo;
  ChatPinRepository(this._repo);

  Future<bool> add(String chatUUID, int position) async {
    try {
      if (chatUUID.isEmpty) return false;
      await _repo.db.execute('DELETE FROM chat_pin WHERE chatUUID = ?;', [
        chatUUID,
      ]);
      await _repo.db.execute(
        'UPDATE chat_pin SET position = position + 1 WHERE position >= ?;',
        [position],
      );
      await _repo.db.execute(
        'INSERT INTO chat_pin (chatUUID, position) VALUES (?, ?);',
        [chatUUID, position],
      );
      return true;
    } catch (e) {
      debugPrint('Error pinning chat: $e');
      return false;
    }
  }

  Future<bool> remove(String chatUUID) async {
    try {
      if (chatUUID.isEmpty) return false;
      final rows = await _repo.db.rawQuery(
        'SELECT position FROM chat_pin WHERE chatUUID = ? LIMIT 1;',
        [chatUUID],
      );
      if (rows.isNotEmpty) {
        final pos = (rows.first['position'] as num).toInt();
        await _repo.db.execute('DELETE FROM chat_pin WHERE chatUUID = ?;', [
          chatUUID,
        ]);
        await _repo.db.execute(
          'UPDATE chat_pin SET position = position - 1 WHERE position > ?;',
          [pos],
        );
      }
      return true;
    } catch (e) {
      debugPrint('Error unpinning chat: $e');
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> get() async {
    try {
      final rows = await _repo.db.rawQuery(
        'SELECT * FROM chat_pin ORDER BY position ASC;',
      );
      return rows.map((r) => Map<String, dynamic>.from(r)).toList();
    } catch (e) {
      debugPrint('Error getting pinned chats: $e');
      return [];
    }
  }
}

class ChatSubRepository {
  final ChatRepository _repo;
  ChatSubRepository(this._repo);

  Future<bool> add(String chatUUID, Map<String, dynamic> sub) async {
    try {
      final subId = sub['id'] is num ? (sub['id'] as num).toInt() : 0;
      await _repo.db.execute(
        '''
        INSERT OR IGNORE INTO chat_sub (id, chatUUID, name, type, created_at)
        VALUES (?, ?, ?, ?, ?);
        ''',
        [
          subId,
          chatUUID,
          sub['name'],
          sub['type'] ?? 'DEFAULT',
          sub['created_at'] ??
              sub['createdAt'] ??
              DateTime.now().toIso8601String(),
        ],
      );
      return true;
    } catch (e) {
      debugPrint('Error adding sub: $e');
      return false;
    }
  }

  Future<bool> update(
    String chatUUID,
    int subID,
    Map<String, dynamic> sub,
  ) async {
    try {
      await _repo.db.execute(
        'UPDATE chat_sub SET name = ? WHERE chatUUID = ? AND id = ?;',
        [sub['name'], chatUUID, subID],
      );
      return true;
    } catch (e) {
      debugPrint('Error updating sub: $e');
      return false;
    }
  }

  Future<bool> remove(String chatUUID, int subID) async {
    try {
      await _repo.db.execute(
        'DELETE FROM message WHERE chatUUID = ? AND subID = ?;',
        [chatUUID, subID],
      );
      await _repo.db.execute(
        'DELETE FROM chat_sub WHERE chatUUID = ? AND id = ?;',
        [chatUUID, subID],
      );
      return true;
    } catch (e) {
      debugPrint('Error removing sub: $e');
      return false;
    }
  }
}

class ChatGetRepository {
  final ChatRepository _repo;
  ChatGetRepository(this._repo);

  Future<List<Map<String, dynamic>>> all([String? localUserUUID]) async {
    try {
      final chatRows = await _repo.db.rawQuery('SELECT * FROM chat;');
      final result = <Map<String, dynamic>>[];

      for (final rawChat in chatRows) {
        final chat = Map<String, dynamic>.from(rawChat);
        final chatUUID = chat['uuid'] as String;

        if (localUserUUID != null && localUserUUID.isNotEmpty) {
          final countRows = await _repo.db.rawQuery(
            '''
            SELECT COUNT(*) as count FROM message
            WHERE chatUUID = ? AND senderUUID != ?
              AND id > (
                SELECT COALESCE(MAX(message_id), 0)
                FROM message_read
                WHERE chat_uuid = ? AND user_uuid = ?
              )
              AND created_at > (
                SELECT joined_at
                FROM member
                WHERE chatUUID = ? AND userUUID = ?
              );
            ''',
            [
              chatUUID,
              localUserUUID,
              chatUUID,
              localUserUUID,
              chatUUID,
              localUserUUID,
            ],
          );
          chat['unreadCount'] = countRows.isNotEmpty
              ? (countRows.first['count'] as num).toInt()
              : 0;

          // Load oldest unread message if it exists
          final oldestRows = await _repo.db.rawQuery(
            '''
            SELECT id, subID FROM message
            WHERE chatUUID = ? AND senderUUID != ?
              AND id > (
                SELECT COALESCE(MAX(message_id), 0)
                FROM message_read
                WHERE chat_uuid = ? AND user_uuid = ?
              )
              AND created_at > (
                SELECT joined_at
                FROM member
                WHERE chatUUID = ? AND userUUID = ?
              )
            ORDER BY created_at ASC
            LIMIT 1;
            ''',
            [
              chatUUID,
              localUserUUID,
              chatUUID,
              localUserUUID,
              chatUUID,
              localUserUUID,
            ],
          );

          final initialMessages = <Map<String, dynamic>>[];
          int? oldestId;
          int? oldestSubId;

          if (oldestRows.isNotEmpty && _repo._messageRepository != null) {
            oldestId = (oldestRows.first['id'] as num).toInt();
            oldestSubId = (oldestRows.first['subID'] as num).toInt();
            final oldestUnread = await _repo._messageRepository!.get.by.id(
              chatUUID,
              oldestSubId,
              oldestId,
            );
            if (oldestUnread != null) initialMessages.add(oldestUnread);
          }

          if (_repo._messageRepository != null) {
            final lastArr = await _repo._messageRepository!.last.get(chatUUID);
            if (lastArr.isNotEmpty) {
              final lastMessage = lastArr.first;
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
          if (_repo._messageRepository != null) {
            chat['messages'] = await _repo._messageRepository!.last.get(
              chatUUID,
            );
          } else {
            chat['messages'] = [];
          }
        }

        chat['members'] = await _repo.member.get.by.chatUUID(chatUUID);

        if (_repo._handleRepository != null) {
          chat['handle'] = await _repo._handleRepository!.get.by.uuid(
            'chat',
            chatUUID,
          );
        }

        final subRows = await _repo.db.rawQuery(
          'SELECT * FROM chat_sub WHERE chatUUID = ? ORDER BY id ASC;',
          [chatUUID],
        );
        final subs = subRows.map((r) => Map<String, dynamic>.from(r)).toList();

        if (_repo._messageRepository != null) {
          final subLastMessages = await _repo._messageRepository!.last.getBySub(
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

        final roleRows = await _repo.db.rawQuery(
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

        final pinnedRows = await _repo.db.rawQuery(
          'SELECT * FROM pinned_message WHERE chatUUID = ?;',
          [chatUUID],
        );
        chat['pinnedMessages'] = pinnedRows
            .map((r) => Map<String, dynamic>.from(r))
            .toList();

        final editedRows = await _repo.db.rawQuery(
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
