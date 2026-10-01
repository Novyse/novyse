import 'dart:io' as io;

import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:sqflite_common_ffi_web/sqflite_ffi_web.dart';

import 'package:novyse/core/storage/database/init_sql.dart';
import 'package:novyse/core/storage/database/repositories/user_repository.dart';
import 'package:novyse/core/storage/database/repositories/handle_repository.dart';
import 'package:novyse/core/storage/database/repositories/chat_repository.dart';
import 'package:novyse/core/storage/database/repositories/message_repository.dart';
import 'package:novyse/core/storage/database/repositories/file_repository.dart';
import 'package:novyse/core/storage/database/repositories/event_repository.dart';
import 'package:novyse/core/storage/database/repositories/queue_job_repository.dart';
import 'package:novyse/core/storage/database/repositories/settings_repository.dart';

export 'package:novyse/core/storage/database/init_sql.dart';
export 'package:novyse/core/storage/database/repositories/user_repository.dart';
export 'package:novyse/core/storage/database/repositories/handle_repository.dart';
export 'package:novyse/core/storage/database/repositories/chat_repository.dart';
export 'package:novyse/core/storage/database/repositories/message_repository.dart';
export 'package:novyse/core/storage/database/repositories/file_repository.dart';
export 'package:novyse/core/storage/database/repositories/event_repository.dart';
export 'package:novyse/core/storage/database/repositories/queue_job_repository.dart';
export 'package:novyse/core/storage/database/repositories/settings_repository.dart';

/// Main SQLite database service for Novyse.
/// One SQLite file per user (`novyse_<userUUID>.db`). Call [openForUser]
/// after login / on startup. Logout wipes the account file via [deleteDatabaseForUser].
class AppDatabase {
  AppDatabase._();
  static final AppDatabase instance = AppDatabase._();

  Database? _db;
  String? _currentUserUUID;
  String? _dbPath;

  late final UserRepository user = UserRepository();
  late final HandleRepository handle = HandleRepository();
  late final MessageRepository message = MessageRepository();
  late final ChatRepository chat = ChatRepository(null, message, handle);
  late final FileRepository file = FileRepository();
  late final EventRepository event = EventRepository();
  late final QueueJobRepository job = QueueJobRepository();
  QueueJobRepository get queue => job;
  late final SettingsLocalRepository settings = SettingsLocalRepository();

  Database? get rawDb => _db;
  bool get isOpen => _db != null && _db!.isOpen;

  String? get currentUserUUID => _currentUserUUID;
  String? get currentDbPath => _dbPath;

  bool isOpenForUser(String userUUID) =>
      isOpen && _currentUserUUID == userUUID;

  static String fileNameForUser(String userUUID) => 'novyse_$userUUID.db';

  Future<String> _resolveDbPath(String userUUID) async {
    final fileName = fileNameForUser(userUUID);
    if (kIsWeb) return fileName;
    if (io.Platform.isLinux ||
        io.Platform.isWindows ||
        io.Platform.isMacOS) {
      final appSupportDir = await getApplicationSupportDirectory();
      return p.join(appSupportDir.path, fileName);
    } else {
      final databasesPath = await getDatabasesPath();
      return p.join(databasesPath, fileName);
    }
  }

  /// Opens (creating if needed) the database file belonging to [userUUID],
  /// closing any previously open database for another user.
  Future<void> openForUser(String userUUID) async {
    if (isOpenForUser(userUUID)) return;
    await initialize(userUUID: userUUID);
  }

  /// Deletes the database file belonging to [userUUID].
  Future<void> deleteDatabaseForUser(String userUUID) async {
    if (isOpenForUser(userUUID)) {
      await close();
    }
    final dbPath = await _resolveDbPath(userUUID);
    if (kIsWeb) {
      await databaseFactory.deleteDatabase(dbPath);
    } else {
      final file = io.File(dbPath);
      if (await file.exists()) await file.delete();
    }
    debugPrint('AppDatabase deleted database for user.');
  }

  /// Initializes the SQLite database for [userUUID] (`novyse_<userUUID>.db`).
  /// [inMemory] is test-only and skips the uuid requirement.
  Future<void> initialize({String? userUUID, bool inMemory = false}) async {
    // Initialize databaseFactory across Web, Desktop (Linux, Windows, macOS) and Mobile
    if (kIsWeb) {
      databaseFactory = databaseFactoryFfiWeb;
    } else if (io.Platform.isLinux ||
        io.Platform.isWindows ||
        io.Platform.isMacOS) {
      sqfliteFfiInit();
      databaseFactory = databaseFactoryFfi;
    }

    String dbPath;
    if (inMemory) {
      dbPath = inMemoryDatabasePath;
    } else {
      if (userUUID == null) {
        throw StateError('AppDatabase.initialize: userUUID required');
      }
      dbPath = await _resolveDbPath(userUUID);
    }

    // Already open for the same user/path, reuse instead of reopening.
    if (isOpen && _dbPath == dbPath) {
      await executeInitSql(_db!);
      return;
    }
    // Switching user: close previous first.
    if (isOpen) {
      await close();
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

    _currentUserUUID = userUUID;
    _dbPath = dbPath;
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
    job.setDb(db);
    settings.setDb(db);
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
    _currentUserUUID = null;
    _dbPath = null;
  }
}

/// Riverpod provider for accessing [AppDatabase].
final databaseProvider = Provider<AppDatabase>((ref) {
  return AppDatabase.instance;
});
