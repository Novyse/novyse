import 'package:flutter/foundation.dart' show debugPrint;
import 'package:sqflite/sqflite.dart';

class HandleRepository {
  DatabaseExecutor? _db;

  HandleRepository([this._db]);

  void setDb(DatabaseExecutor db) {
    _db = db;
  }

  DatabaseExecutor get db {
    final database = _db;
    if (database == null) {
      throw StateError('HandleRepository: database is not set or initialized.');
    }
    return database;
  }

  late final HandleGetRepository get = HandleGetRepository(this);
  late final HandleUpdateRepository update = HandleUpdateRepository(this);
}

class HandleGetRepository {
  final HandleRepository _repo;
  HandleGetRepository(this._repo);

  late final HandleGetByRepository by = HandleGetByRepository(_repo);
}

class HandleGetByRepository {
  final HandleRepository _repo;
  HandleGetByRepository(this._repo);

  Future<String?> uuid(String type, String uuid) async {
    try {
      final column = switch (type.toLowerCase()) {
        'user' => 'userUUID',
        'chat' => 'chatUUID',
        'bot' => 'botUUID',
        _ => '${type}UUID',
      };
      final result = await _repo.db.rawQuery(
        'SELECT handle FROM handle WHERE $column = ? LIMIT 1;',
        [uuid],
      );
      if (result.isNotEmpty) {
        return result.first['handle'] as String?;
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching handle by ${type}UUID: $e');
      return null;
    }
  }
}

class HandleUpdateRepository {
  final HandleRepository _repo;
  HandleUpdateRepository(this._repo);

  Future<bool> user(String userUUID, String handle) async {
    try {
      if (userUUID.isEmpty || handle.isEmpty) return false;
      await _repo.db.rawInsert(
        '''
        INSERT INTO handle (userUUID, type, handle) VALUES (?, 'USER', ?)
        ON CONFLICT(handle) DO UPDATE SET userUUID = excluded.userUUID;
        ''',
        [userUUID, handle],
      );
      return true;
    } catch (e) {
      debugPrint('Error updating user handle: $e');
      return false;
    }
  }

  Future<bool> chat(String chatUUID, String handle) async {
    try {
      if (chatUUID.isEmpty || handle.isEmpty) return false;
      await _repo.db.rawInsert(
        '''
        INSERT INTO handle (chatUUID, type, handle) VALUES (?, 'CHAT', ?)
        ON CONFLICT(handle) DO UPDATE SET chatUUID = excluded.chatUUID;
        ''',
        [chatUUID, handle],
      );
      return true;
    } catch (e) {
      debugPrint('Error updating chat handle: $e');
      return false;
    }
  }
}
