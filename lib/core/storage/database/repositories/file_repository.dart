import 'dart:convert';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:sqflite/sqflite.dart';

class FileRepository {
  DatabaseExecutor? _db;

  FileRepository([this._db]);

  void setDb(DatabaseExecutor db) {
    _db = db;
  }

  DatabaseExecutor get db {
    final database = _db;
    if (database == null) {
      throw StateError('FileRepository: database is not set or initialized.');
    }
    return database;
  }

  late final FileGetRepository get = FileGetRepository(this);
  late final FileUpdateRepository update = FileUpdateRepository(this);

  Future<bool> add(
    String uuid,
    String name,
    String mimeType,
    int size, {
    String? ref,
    dynamic waveform,
    int? duration,
  }) async {
    try {
      if (uuid.isEmpty || name.isEmpty || mimeType.isEmpty) return false;
      final waveformStr = waveform != null
          ? (waveform is String ? waveform : jsonEncode(waveform))
          : null;

      await db.execute(
        '''
        INSERT OR REPLACE INTO file (uuid, name, ref, mimeType, size, duration, waveform)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        ''',
        [uuid, name, ref, mimeType, size, duration ?? 0, waveformStr],
      );
      return true;
    } catch (e) {
      debugPrint('Error adding file: $e');
      return false;
    }
  }
}

class FileGetRepository {
  final FileRepository _repo;
  FileGetRepository(this._repo);

  Future<String?> ref(String fileUUID) async {
    try {
      final rows = await _repo.db.rawQuery(
        'SELECT ref FROM file WHERE uuid = ? LIMIT 1;',
        [fileUUID],
      );
      if (rows.isNotEmpty) {
        return rows.first['ref'] as String?;
      }
      return null;
    } catch (e) {
      debugPrint('Error retrieving file ref: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> all(String fileUUID) async {
    try {
      final rows = await _repo.db.rawQuery(
        'SELECT * FROM file WHERE uuid = ? LIMIT 1;',
        [fileUUID],
      );
      if (rows.isNotEmpty) {
        final file = Map<String, dynamic>.from(rows.first);
        if (file['waveform'] is String) {
          try {
            file['waveform'] = jsonDecode(file['waveform'] as String);
          } catch (_) {}
        }
        return file;
      }
      return null;
    } catch (e) {
      debugPrint('Error retrieving all file info: $e');
      return null;
    }
  }

  Future<int> totalSize() async {
    try {
      final rows = await _repo.db.rawQuery(
        'SELECT SUM(size) as totalSize FROM file;',
      );
      if (rows.isNotEmpty && rows.first['totalSize'] != null) {
        return (rows.first['totalSize'] as num).toInt();
      }
      return 0;
    } catch (e) {
      debugPrint('Error calculating total file size: $e');
      return 0;
    }
  }
}

class FileUpdateRepository {
  final FileRepository _repo;
  FileUpdateRepository(this._repo);

  Future<bool> ref(String fileUUID, String newRef) async {
    try {
      if (fileUUID.isEmpty) return false;
      await _repo.db.execute(
        'UPDATE file SET ref = ? WHERE uuid = ?;',
        [newRef, fileUUID],
      );
      return true;
    } catch (e) {
      debugPrint('Error updating file ref: $e');
      return false;
    }
  }

  Future<bool> waveform(String fileUUID, dynamic newWaveform) async {
    try {
      if (fileUUID.isEmpty || newWaveform == null) return false;
      final waveformStr = newWaveform is String
          ? newWaveform
          : jsonEncode(newWaveform);
      await _repo.db.execute(
        'UPDATE file SET waveform = ? WHERE uuid = ?;',
        [waveformStr, fileUUID],
      );
      return true;
    } catch (e) {
      debugPrint('Error updating file waveform: $e');
      return false;
    }
  }

  Future<bool> duration(String fileUUID, int newDuration) async {
    try {
      if (fileUUID.isEmpty) return false;
      await _repo.db.execute(
        'UPDATE file SET duration = ? WHERE uuid = ?;',
        [newDuration, fileUUID],
      );
      return true;
    } catch (e) {
      debugPrint('Error updating file duration: $e');
      return false;
    }
  }

  Future<bool> uri(String fileUUID, String uri) async {
    return ref(fileUUID, uri);
  }
}
