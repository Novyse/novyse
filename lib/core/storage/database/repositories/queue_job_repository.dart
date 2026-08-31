import 'dart:convert';

import 'package:sqflite/sqflite.dart';

/// Repository for persisting and managing queued jobs across app restarts.
class QueueJobRepository {
  DatabaseExecutor? _db;

  QueueJobRepository([this._db]);

  void setDb(DatabaseExecutor db) {
    _db = db;
  }

  DatabaseExecutor get db {
    final database = _db;
    if (database == null) {
      throw StateError(
        'QueueJobRepository: database is not set or initialized.',
      );
    }
    return database;
  }

  /// Inserts or replaces a job in the queue.
  Future<bool> save(Map<String, dynamic> job) async {
    try {
      final payloadStr = job['payload'] is String
          ? job['payload'] as String
          : jsonEncode(job['payload'] ?? {});

      await db.insert('queue_job', {
        'id': job['id'],
        'chat_uuid': job['chat_uuid'] ?? job['chatUUID'],
        'sub_id': job['sub_id'] ?? job['subID'] ?? 0,
        'job_type': job['job_type'] ?? job['jobType'],
        'priority': job['priority'] ?? 10,
        'status': job['status'] ?? 'PENDING',
        'payload': payloadStr,
        'progress': (job['progress'] as num?)?.toDouble() ?? 0.0,
        'attempts': job['attempts'] ?? 0,
        'max_retries': job['max_retries'] ?? job['maxRetries'] ?? 5,
        'error_message': job['error_message'] ?? job['errorMessage'],
        'created_at': job['created_at'] ?? DateTime.now().toIso8601String(),
        'updated_at': DateTime.now().toIso8601String(),
      }, conflictAlgorithm: ConflictAlgorithm.replace);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Updates job status, progress, error message or attempt count.
  Future<bool> updateStatus(
    String id,
    String status, {
    double? progress,
    String? errorMessage,
    int? attempts,
  }) async {
    try {
      final updates = <String, dynamic>{
        'status': status,
        'updated_at': DateTime.now().toIso8601String(),
      };
      if (progress != null) updates['progress'] = progress;
      if (errorMessage != null) updates['error_message'] = errorMessage;
      if (attempts != null) updates['attempts'] = attempts;

      await db.update(
        'queue_job',
        updates,
        where: 'id = ?',
        whereArgs: [id],
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Updates the JSON payload of a job (e.g. after content edit or file removal).
  Future<bool> updatePayload(String id, Map<String, dynamic> payload) async {
    try {
      await db.update(
        'queue_job',
        {
          'payload': jsonEncode(payload),
          'updated_at': DateTime.now().toIso8601String(),
        },
        where: 'id = ?',
        whereArgs: [id],
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Retrieves a job by ID.
  Future<Map<String, dynamic>?> get(String id) async {
    try {
      final results = await db.query(
        'queue_job',
        where: 'id = ?',
        whereArgs: [id],
        limit: 1,
      );
      if (results.isEmpty) return null;
      return _parseJobRow(results.first);
    } catch (_) {
      return null;
    }
  }

  /// Loads pending, processing, or paused jobs.
  Future<List<Map<String, dynamic>>> getPendingJobs({String? chatUUID}) async {
    try {
      String whereClause = "status IN ('PENDING', 'PROCESSING', 'PAUSED')";
      final whereArgs = <dynamic>[];

      if (chatUUID != null) {
        whereClause += ' AND chat_uuid = ?';
        whereArgs.add(chatUUID);
      }

      final results = await db.query(
        'queue_job',
        where: whereClause,
        whereArgs: whereArgs,
        orderBy: 'priority DESC, created_at ASC',
      );

      return results.map(_parseJobRow).toList();
    } catch (_) {
      return [];
    }
  }

  /// Loads all jobs for a specific chat.
  Future<List<Map<String, dynamic>>> getByChat(String chatUUID) async {
    try {
      final results = await db.query(
        'queue_job',
        where: 'chat_uuid = ?',
        whereArgs: [chatUUID],
        orderBy: 'priority DESC, created_at ASC',
      );
      return results.map(_parseJobRow).toList();
    } catch (_) {
      return [];
    }
  }

  /// Deletes a job by ID.
  Future<bool> delete(String id) async {
    try {
      await db.delete(
        'queue_job',
        where: 'id = ?',
        whereArgs: [id],
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  /// On startup, resets any job marked as 'PROCESSING' back to 'PENDING'.
  Future<bool> resetProcessingToPending() async {
    try {
      await db.update('queue_job', {
        'status': 'PENDING',
        'updated_at': DateTime.now().toIso8601String(),
      }, where: "status = 'PROCESSING'");
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Clears completed jobs from the database.
  Future<int> clearCompleted() async {
    try {
      return await db.delete('queue_job', where: "status = 'COMPLETED'");
    } catch (_) {
      return 0;
    }
  }

  Map<String, dynamic> _parseJobRow(Map<String, dynamic> row) {
    final copy = Map<String, dynamic>.from(row);
    if (copy['payload'] is String) {
      try {
        copy['payload'] = jsonDecode(copy['payload'] as String);
      } catch (_) {
        copy['payload'] = {};
      }
    }
    return copy;
  }
}
