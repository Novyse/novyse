import 'dart:io' as io;
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import 'package:novyse/core/storage/database/init_sql.dart';
import 'package:novyse/core/storage/database/repositories/user_repository.dart';
import 'package:novyse/core/storage/database/repositories/handle_repository.dart';
import 'package:novyse/core/storage/database/repositories/chat_repository.dart';
import 'package:novyse/core/storage/database/repositories/message_repository.dart';
import 'package:novyse/core/storage/database/repositories/file_repository.dart';
import 'package:novyse/core/storage/database/repositories/event_repository.dart';

export 'package:novyse/core/storage/database/init_sql.dart';
export 'package:novyse/core/storage/database/repositories/user_repository.dart';
export 'package:novyse/core/storage/database/repositories/handle_repository.dart';
export 'package:novyse/core/storage/database/repositories/chat_repository.dart';
export 'package:novyse/core/storage/database/repositories/message_repository.dart';
export 'package:novyse/core/storage/database/repositories/file_repository.dart';
export 'package:novyse/core/storage/database/repositories/event_repository.dart';

/// Main SQLite database service for Novyse.
class AppDatabase {
  AppDatabase._();
  static final AppDatabase instance = AppDatabase._();

  Database? _db;

  late final UserRepository user = UserRepository();
  late final HandleRepository handle = HandleRepository();
  late final MessageRepository message = MessageRepository();
  late final ChatRepository chat = ChatRepository(null, message, handle);
  late final FileRepository file = FileRepository();
  late final EventRepository event = EventRepository();

  Database? get rawDb => _db;
  bool get isOpen => _db != null && _db!.isOpen;

  /// Initializes the SQLite database.
  Future<void> initialize({
    String? path,
    Database? customDb,
    bool inMemory = false,
  }) async {
    if (customDb != null) {
      _setDatabase(customDb);
      return;
    }

    // Initialize FFI for desktop (Linux, Windows) and testing environments
    if (!kIsWeb && (io.Platform.isLinux || io.Platform.isWindows)) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    String dbPath;
    if (inMemory) {
      dbPath = inMemoryDatabasePath;
    } else if (path != null) {
      dbPath = path;
    } else {
      if (!kIsWeb && (io.Platform.isLinux || io.Platform.isWindows)) {
        final appSupportDir = await getApplicationSupportDirectory();
        dbPath = p.join(appSupportDir.path, 'novyse.db');
      } else {
        final databasesPath = await getDatabasesPath();
        dbPath = p.join(databasesPath, 'novyse.db');
      }
    }

    final db = await openDatabase(
      dbPath,
      version: 1,
      onCreate: (db, version) async {
        await executeInitSql(db);
      },
    );

    // Verify and ensure tables exist even if DB file already existed
    await executeInitSql(db);

    _setDatabase(db);
    debugPrint('AppDatabase initialized at: $dbPath');
  }

  void _setDatabase(Database db) {
    _db = db;
    user.setDb(db);
    handle.setDb(db);
    message.setDb(db);
    chat.setDb(db);
    chat.setRepositories(message, handle);
    file.setDb(db);
    event.setDb(db);
  }

  /// Sets an active database instance directly (useful for tests).
  void setDb(Database db) {
    _setDatabase(db);
  }

  /// Helper to update a file URI/ref.
  Future<bool> updateFileURI(String fileUUID, String uri) async {
    return file.update.uri(fileUUID, uri);
  }

  /// Clears all tables in the database and re-initializes the schema.
  Future<void> clear() async {
    final db = _db;
    if (db == null) return;

    try {
      final tables = await db.rawQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
      );
      for (final table in tables) {
        final name = table['name'] as String?;
        if (name != null) {
          await db.execute('DROP TABLE IF EXISTS $name;');
        }
      }
      await executeInitSql(db);
      debugPrint('AppDatabase cleared and re-initialized successfully.');
    } catch (e) {
      debugPrint('Error clearing database: $e');
    }
  }

  /// Closes the database connection.
  Future<void> close() async {
    final db = _db;
    if (db != null) {
      await db.close();
      _db = null;
    }
  }
}

/// Riverpod provider for accessing [AppDatabase].
final databaseProvider = Provider<AppDatabase>((ref) {
  return AppDatabase.instance;
});
