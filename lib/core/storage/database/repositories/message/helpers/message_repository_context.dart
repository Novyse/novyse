import 'package:sqflite/sqflite.dart';

/// Context interface providing database access and enrichment capabilities
/// to message sub-repositories.
abstract class MessageRepositoryContext {
  /// The active database executor (Database or Transaction).
  DatabaseExecutor get db;

  /// Enriches a raw message map with reads, reactions, replies, files, etc.
  Future<void> addInfos(Map<String, dynamic> message);
}
