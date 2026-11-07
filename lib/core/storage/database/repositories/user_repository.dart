import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:sqflite/sqflite.dart';

class UserRepository {
  DatabaseExecutor? _db;
  late final ProfileRepository profile;
  late final UserGetRepository get;
  late final UserUpdateRepository update;

  UserRepository([this._db]) {
    profile = ProfileRepository(_db);
    get = UserGetRepository(this);
    update = UserUpdateRepository(this);
  }

  void setDb(DatabaseExecutor db) {
    _db = db;
    profile.setDb(db);
  }

  DatabaseExecutor get db {
    final database = _db;
    if (database == null) {
      throw StateError('UserRepository: database is not set or initialized.');
    }
    return database;
  }

  /// Adds a single user and their handle to the database.
  ///
  /// Only the fields present in [user] are written: a chat member event
  /// carries the name alone, and replacing the whole row would drop the banner
  /// and the customization pulled earlier.
  Future<bool> add(Map<String, dynamic> user) async {
    try {
      return await _upsertUser(db, user);
    } catch (e) {
      debugPrint('Error adding user: $e');
      return false;
    }
  }

  /// Adds multiple users and their handles sequentially.
  Future<bool> addMultiple(List<dynamic> users) async {
    try {
      if (users.isEmpty) return false;

      for (final raw in users) {
        if (raw is! Map) continue;
        await _upsertUser(db, Map<String, dynamic>.from(raw));
      }

      return true;
    } catch (e) {
      debugPrint('Error adding multiple users: $e');
      return false;
    }
  }
}

/// Inserts [user] or merges the fields it carries into the existing row.
Future<bool> _upsertUser(DatabaseExecutor db, Map<String, dynamic> user) async {
  final uuid = user['uuid'] as String?;
  final name = user['name'] as String?;

  if (uuid == null || name == null) {
    debugPrint('Missing required user fields: uuid=$uuid, name=$name');
    return false;
  }

  final customization = user['customization'] is Map
      ? Map<String, dynamic>.from(user['customization'] as Map)
      : const <String, dynamic>{};

  dynamic pick(String key) =>
      customization.containsKey(key) ? customization[key] : user[key];
  bool has(String key) =>
      customization.containsKey(key) || user.containsKey(key);

  final columns = <String, dynamic>{
    'name': name,
    if (user.containsKey('surname')) 'surname': user['surname'],
    if (user.containsKey('profilePictureUUID'))
      'profilePictureUUID': user['profilePictureUUID'],
    if (user.containsKey('bannerPictureUUID'))
      'bannerPictureUUID': user['bannerPictureUUID'],
    if (user.containsKey('biography')) 'biography': user['biography'],
    if (user.containsKey('birthday')) 'birthday': user['birthday'],
    if (user.containsKey('region')) 'region': user['region'],
    if (user.containsKey('country')) 'country': user['country'],
    if (user.containsKey('profileEventID'))
      'profileEventID': user['profileEventID'],
    if (has('lastActive'))
      'lastActive': pick('lastActive') ?? pick('last_active'),
    if (has('cardPictureUUID'))
      'cardPictureUUID': pick('cardPictureUUID')?.toString(),
    if (has('cardColor')) 'cardColor': _jsonColumnValue(pick('cardColor')),
    if (has('cardEffect')) 'cardEffect': pick('cardEffect')?.toString(),
    if (has('cardBorder')) 'cardBorder': pick('cardBorder')?.toString(),
    if (has('nameColor')) 'nameColor': _jsonColumnValue(pick('nameColor')),
    if (has('nameFont')) 'nameFont': pick('nameFont')?.toString(),
    if (has('nameEffect')) 'nameEffect': pick('nameEffect')?.toString(),
    if (has('avatarEffect')) 'avatarEffect': pick('avatarEffect')?.toString(),
    if (has('avatarBorder')) 'avatarBorder': pick('avatarBorder')?.toString(),
    if (has('bannerColor'))
      'bannerColor': _jsonColumnValue(pick('bannerColor')),
  };

  await db.execute('INSERT OR IGNORE INTO user (uuid, name) VALUES (?, ?);', [
    uuid,
    name,
  ]);
  final assignments = columns.keys.map((column) => '$column = ?').join(', ');
  await db.execute('UPDATE user SET $assignments WHERE uuid = ?;', [
    ...columns.values,
    uuid,
  ]);

  final handle = user['handle'] as String?;
  if (handle != null && handle.isNotEmpty) {
    await db.execute(
      '''
      INSERT INTO handle (userUUID, type, handle) VALUES (?, 'USER', ?)
      ON CONFLICT(handle) DO UPDATE SET userUUID = excluded.userUUID;
      ''',
      [uuid, handle],
    );
  }

  return true;
}

/// Stores maps and lists (the gradients) as JSON text in their column.
dynamic _jsonColumnValue(dynamic value) {
  if (value == null) return null;
  if (value is String) return value.isEmpty ? null : value;
  if (value is Map || value is List) return jsonEncode(value);
  return value.toString();
}

class UserGetRepository {
  final UserRepository _repo;
  UserGetRepository(this._repo);

  /// Get user by UUID including their handle.
  Future<Map<String, dynamic>?> byUUID(String userUUID) async {
    try {
      final rows = await _repo.db.rawQuery(
        'SELECT * FROM user WHERE uuid = ? LIMIT 1;',
        [userUUID],
      );
      if (rows.isEmpty) return null;

      final user = Map<String, dynamic>.from(rows.first);
      final handleRows = await _repo.db.rawQuery(
        "SELECT handle FROM handle WHERE userUUID = ? AND type = 'USER' LIMIT 1;",
        [userUUID],
      );
      if (handleRows.isNotEmpty) {
        user['handle'] = handleRows.first['handle'];
      }
      return user;
    } catch (e) {
      debugPrint('Error retrieving user by UUID: $e');
      return null;
    }
  }

  /// Get all users with their handle.
  Future<List<Map<String, dynamic>>> all() async {
    try {
      final rows = await _repo.db.rawQuery('''
        SELECT u.*, h.handle FROM user u
        LEFT JOIN handle h ON u.uuid = h.userUUID AND h.type = 'USER';
        ''');
      return rows.map((r) => Map<String, dynamic>.from(r)).toList();
    } catch (e) {
      debugPrint('Error retrieving all users: $e');
      return [];
    }
  }

  /// Get user by handle.
  Future<Map<String, dynamic>?> byHandle(String handle) async {
    try {
      final handleRows = await _repo.db.rawQuery(
        "SELECT userUUID FROM handle WHERE handle = ? AND type = 'USER' LIMIT 1;",
        [handle],
      );
      if (handleRows.isEmpty) return null;
      final userUUID = handleRows.first['userUUID'] as String?;
      if (userUUID == null) return null;

      final userRows = await _repo.db.rawQuery(
        'SELECT * FROM user WHERE uuid = ? LIMIT 1;',
        [userUUID],
      );
      if (userRows.isEmpty) return null;

      final user = Map<String, dynamic>.from(userRows.first);
      user['handle'] = handle;
      return user;
    } catch (e) {
      debugPrint('Error retrieving user by handle: $e');
      return null;
    }
  }
}

class UserUpdateRepository {
  final UserRepository _repo;
  UserUpdateRepository(this._repo);

  /// Get all event IDs for synchronization.
  Future<Map<String, dynamic>> getAllEventsIDs() async {
    try {
      final chatRows = await _repo.db.rawQuery('''
        SELECT uuid as chatUUID, COALESCE(eventID, 0) as eventID FROM chat;
        ''');

      final subRows = await _repo.db.rawQuery('''
        SELECT chatUUID, subID, COALESCE(MAX(id), 0) as messageID
        FROM message
        GROUP BY chatUUID, subID;
        ''');

      final subsByChat = <String, List<Map<String, dynamic>>>{};
      for (final row in subRows) {
        final chatUUID = row['chatUUID'] as String;
        subsByChat.putIfAbsent(chatUUID, () => []).add({
          'subID': row['subID'],
          'messageID': row['messageID'],
        });
      }

      final chats = chatRows.map((c) {
        final chatUUID = c['chatUUID'] as String;
        return {
          'chatUUID': chatUUID,
          'eventID': c['eventID'],
          'subs': subsByChat[chatUUID] ?? [],
        };
      }).toList();

      final userRows = await _repo.db.rawQuery('''
        SELECT uuid as userUUID, COALESCE(profileEventID, 0) as profileEventID FROM user;
        ''');

      final users = userRows
          .map(
            (u) => {
              'userUUID': u['userUUID'],
              'profileEventID': u['profileEventID'],
            },
          )
          .toList();

      return {'chats': chats, 'users': users};
    } catch (e) {
      debugPrint('Error retrieving all event IDs: $e');
      return {'chats': [], 'users': []};
    }
  }
}

class ProfileRepository {
  DatabaseExecutor? _db;

  ProfileRepository([this._db]);

  void setDb(DatabaseExecutor db) {
    _db = db;
  }

  DatabaseExecutor get db {
    final database = _db;
    if (database == null) {
      throw StateError(
        'ProfileRepository: database is not set or initialized.',
      );
    }
    return database;
  }

  late final name = ProfileFieldUpdateRepository(this, 'name');
  late final surname = ProfileFieldUpdateRepository(this, 'surname');
  late final biography = ProfileFieldUpdateRepository(this, 'biography');
  late final birthday = ProfileFieldUpdateRepository(this, 'birthday');
  late final region = ProfileFieldUpdateRepository(this, 'region');
  late final country = ProfileFieldUpdateRepository(this, 'country');
  late final banner = ProfileFieldUpdateRepository(this, 'bannerPictureUUID');
  late final cardPicture = ProfileFieldUpdateRepository(
    this,
    'cardPictureUUID',
  );
  late final cardColor = ProfileFieldUpdateRepository(this, 'cardColor');
  late final cardEffect = ProfileFieldUpdateRepository(this, 'cardEffect');
  late final cardBorder = ProfileFieldUpdateRepository(this, 'cardBorder');
  late final nameColor = ProfileFieldUpdateRepository(this, 'nameColor');
  late final nameFont = ProfileFieldUpdateRepository(this, 'nameFont');
  late final nameEffect = ProfileFieldUpdateRepository(this, 'nameEffect');
  late final avatarEffect = ProfileFieldUpdateRepository(this, 'avatarEffect');
  late final avatarBorder = ProfileFieldUpdateRepository(this, 'avatarBorder');
  late final bannerColor = ProfileFieldUpdateRepository(this, 'bannerColor');
  late final picture = ProfilePictureRepository(this);
}

class ProfileFieldUpdateRepository {
  final ProfileRepository _repo;
  final String _column;

  ProfileFieldUpdateRepository(this._repo, this._column);

  Future<bool> update(String userUUID, dynamic value) async {
    try {
      if (userUUID.isEmpty) return false;
      final val = _jsonColumnValue(value);
      await _repo.db.execute('UPDATE user SET $_column = ? WHERE uuid = ?;', [
        val,
        userUUID,
      ]);
      return true;
    } catch (e) {
      debugPrint('Error updating user $_column: $e');
      return false;
    }
  }
}

class ProfilePictureRepository {
  final ProfileRepository _repo;
  ProfilePictureRepository(this._repo);

  Future<bool> update(String userUUID, String profilePictureUUID) async {
    try {
      if (userUUID.isEmpty || profilePictureUUID.isEmpty) return false;
      await _repo.db.execute(
        'UPDATE user SET profilePictureUUID = ? WHERE uuid = ?;',
        [profilePictureUUID, userUUID],
      );
      return true;
    } catch (e) {
      debugPrint('Error updating user profile picture: $e');
      return false;
    }
  }

  Future<String?> get(String userUUID) async {
    try {
      final rows = await _repo.db.rawQuery(
        'SELECT profilePictureUUID FROM user WHERE uuid = ? LIMIT 1;',
        [userUUID],
      );
      if (rows.isNotEmpty) {
        return rows.first['profilePictureUUID'] as String?;
      }
      return null;
    } catch (e) {
      debugPrint('Error retrieving user profile picture: $e');
      return null;
    }
  }

  Future<bool> set(String userUUID, String pictureUUID) async {
    return update(userUUID, pictureUUID);
  }
}
