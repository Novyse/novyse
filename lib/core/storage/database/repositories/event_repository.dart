import 'package:flutter/foundation.dart' show debugPrint;
import 'package:sqflite/sqflite.dart';

class EventRepository {
  DatabaseExecutor? _db;

  EventRepository([this._db]);

  void setDb(DatabaseExecutor db) {
    _db = db;
  }

  DatabaseExecutor get db {
    final database = _db;
    if (database == null) {
      throw StateError('EventRepository: database is not set or initialized.');
    }
    return database;
  }

  late final EventChatRepository chat = EventChatRepository(this);
  late final EventUserRepository user = EventUserRepository(this);
}

class EventChatRepository {
  final EventRepository _repo;
  EventChatRepository(this._repo);

  Future<bool> update(String chatUUID, int eventID) async {
    try {
      if (chatUUID.isEmpty) return false;
      await _repo.db.rawUpdate(
        'UPDATE chat SET eventID = ? WHERE uuid = ?;',
        [eventID, chatUUID],
      );
      return true;
    } catch (e) {
      debugPrint('Error updating chat event ID: $e');
      return false;
    }
  }
}

class EventUserRepository {
  final EventRepository _repo;
  EventUserRepository(this._repo);

  late final EventUserProfileRepository profile = EventUserProfileRepository(_repo);
}

class EventUserProfileRepository {
  final EventRepository _repo;
  EventUserProfileRepository(this._repo);

  Future<bool> update(String userUUID, int profileEventID) async {
    try {
      if (userUUID.isEmpty) return false;
      await _repo.db.rawUpdate(
        'UPDATE user SET profileEventID = ? WHERE uuid = ?;',
        [profileEventID, userUUID],
      );
      return true;
    } catch (e) {
      debugPrint('Error updating user profile event ID: $e');
      return false;
    }
  }
}
