import 'dart:convert';

import 'package:sqflite/sqflite.dart';

class SettingsLocalRepository {
  DatabaseExecutor? _db;

  SettingsLocalRepository([this._db]);

  void setDb(DatabaseExecutor db) {
    _db = db;
  }

  DatabaseExecutor get db {
    final database = _db;
    if (database == null) {
      throw StateError(
        'SettingsLocalRepository: database is not set or initialized.',
      );
    }
    return database;
  }

  /// Inserts or replaces a materialized preference value.
  Future<bool> upsertSetting({
    required String key,
    required Object? value,
    required String scope,
  }) async {
    try {
      await db.insert('local_settings', {
        'key': key,
        'value_json': jsonEncode(value),
        'scope': scope,
        'updated_at': DateTime.now().toIso8601String(),
      }, conflictAlgorithm: ConflictAlgorithm.replace);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Inserts or replaces many preference values with one call.
  Future<bool> upsertAll({
    required Map<String, Object?> values,
    required String scope,
  }) async {
    if (values.isEmpty) return true;
    try {
      final now = DateTime.now().toIso8601String();
      for (final entry in values.entries) {
        await db.insert(
          'local_settings',
          {
            'key': entry.key,
            'value_json': jsonEncode(entry.value),
            'scope': scope,
            'updated_at': now,
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Returns all materialized preferences as key -> decoded value.
  Future<Map<String, Object?>> getAllSettings() async {
    try {
      final rows = await db.query('local_settings');
      final result = <String, Object?>{};
      for (final row in rows) {
        final key = row['key'] as String?;
        if (key == null) continue;
        result[key] = _decodeValue(row['value_json'] as String?);
      }
      return result;
    } catch (_) {
      return {};
    }
  }

  /// Clears all settings state.
  Future<bool> clearAll() async {
    try {
      await db.delete('local_settings');
      return true;
    } catch (_) {
      return false;
    }
  }

  Object? _decodeValue(String? raw) {
    if (raw == null) return null;
    try {
      return jsonDecode(raw);
    } catch (_) {
      return raw;
    }
  }
}
