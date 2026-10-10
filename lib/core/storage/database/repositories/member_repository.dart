import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:sqflite/sqflite.dart';

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
