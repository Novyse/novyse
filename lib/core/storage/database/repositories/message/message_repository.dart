import 'package:sqflite/sqflite.dart';
import 'package:novyse/core/storage/database/repositories/message/enrichment/message_enrichment.dart';
import 'package:novyse/core/storage/database/repositories/message/favorite/message_favorite_repository.dart';
import 'package:novyse/core/storage/database/repositories/message/get/message_get_repository.dart';
import 'package:novyse/core/storage/database/repositories/message/helpers/message_field_parser.dart';
import 'package:novyse/core/storage/database/repositories/message/helpers/message_repository_context.dart';
import 'package:novyse/core/storage/database/repositories/message/last/message_last_repository.dart';
import 'package:novyse/core/storage/database/repositories/message/mutations/message_mutations.dart';
import 'package:novyse/core/storage/database/repositories/message/mutations/message_search.dart';
import 'package:novyse/core/storage/database/repositories/message/pin/message_pin_repository.dart';
import 'package:novyse/core/storage/database/repositories/message/reaction/message_reaction_repository.dart';
import 'package:novyse/core/storage/database/repositories/message/read/message_read_repository.dart';

/// Central facade coordinating message database operations, queries, and enrichment.
class MessageRepository implements MessageRepositoryContext {
  DatabaseExecutor? _db;

  MessageRepository([this._db]);

  void setDb(DatabaseExecutor db) {
    _db = db;
  }

  @override
  DatabaseExecutor get db {
    final database = _db;
    if (database == null) {
      throw StateError(
        'MessageRepository: database is not set or initialized.',
      );
    }
    return database;
  }

  late final MessageGetRepository get = MessageGetRepository(this);
  late final MessagePinRepository pin = MessagePinRepository(this);
  late final MessageLastRepository last = MessageLastRepository(this);
  late final MessageReactionRepository reaction = MessageReactionRepository(
    this,
  );
  late final MessageReadRepository read = MessageReadRepository(this);
  late final MessageFavoriteRepository favorite = MessageFavoriteRepository(
    this,
  );

  late final MessageEnrichment _enrichment = MessageEnrichment(() => db);
  late final MessageMutations _mutations = MessageMutations(() => db);
  late final MessageSearch _search = MessageSearch(() => db);

  /// Helper to safely parse a message ID to an int.
  static int parseId(dynamic id) => MessageFieldParser.parseId(id);

  /// Adds a single message and its associated replies, files, reads, and reactions.
  Future<bool> add(Map<String, dynamic> message) => _mutations.add(message);

  /// Adds multiple messages to the database sequentially.
  Future<bool> addMultiple(List<dynamic> messages) =>
      _mutations.addMultiple(messages);

  /// Searches messages by content with optional chatUUID and subID filters.
  Future<List<Map<String, dynamic>>> search(
    String query, {
    String? chatUUID,
    int? subID,
    int limit = 50,
  }) => _search.search(query, chatUUID: chatUUID, subID: subID, limit: limit);

  /// Edits a message content and/or file associations, recording it in edited_message.
  Future<bool> edit(
    String chatUUID,
    int subID,
    dynamic messageID,
    String? content, {
    List<dynamic>? files,
  }) => _mutations.edit(
    chatUUID,
    subID,
    messageID,
    content,
    files: files,
  );

  /// Deletes a message from the database.
  Future<bool> delete(String chatUUID, int subID, dynamic messageID) =>
      _mutations.delete(chatUUID, subID, messageID);

  /// Enriches a message with reactions, reads, replies, files, and flags.
  @override
  Future<void> addInfos(Map<String, dynamic> message) =>
      _enrichment.addInfos(message);
}
