import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:novyse/core/storage/database/repositories/handle_repository.dart';
import 'package:novyse/core/storage/database/repositories/member_repository.dart';
import 'package:novyse/core/storage/database/repositories/message_repository.dart';
import 'package:sqflite/sqflite.dart';

import 'chat_get_repository.dart';
import 'chat_pin_repository.dart';
import 'chat_sub_repository.dart';

export 'chat_get_repository.dart';
export 'chat_pin_repository.dart';
export 'chat_sub_repository.dart';
export 'member_repository.dart';

/// Supplies the database handle, throwing when it is not open yet.
typedef DbProvider = DatabaseExecutor Function();

class ChatRepository {
  DatabaseExecutor? _db;
  late final MemberRepository member;
  MessageRepository? _messageRepository;
  HandleRepository? _handleRepository;

  ChatRepository([this._db, this._messageRepository, this._handleRepository]) {
    member = MemberRepository(_db);
    pin = ChatPinRepository(() => db);
    sub = ChatSubRepository(() => db);
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

  MessageRepository? get messageRepository => _messageRepository;

  HandleRepository? get handleRepository => _handleRepository;

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
        INSERT OR REPLACE INTO chat (uuid, type, name, description, profilePictureUUID, eventID)
        VALUES (?, ?, ?, ?, ?, ?);
        ''',
        [
          uuid,
          type,
          chat['name'],
          chat['description'],
          chat['profilePictureUUID'],
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
              s['type'],
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
          INSERT OR REPLACE INTO chat (uuid, type, name, description, profilePictureUUID, eventID)
          VALUES (?, ?, ?, ?, ?, ?);
          ''',
          [
            uuid,
            type,
            chat['name'],
            chat['description'],
            chat['profilePictureUUID'],
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
            sub['type'],
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
