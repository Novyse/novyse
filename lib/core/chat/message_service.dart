import 'package:novyse/core/storage/database/database.dart';

/// Message service helper providing message persistence and formatting operations.
class MessageService {
  MessageService._();
  static final MessageService instance = MessageService._();

  /// Adds a single message to local database.
  Future<bool> add(Map<String, dynamic> message) async {
    return AppDatabase.instance.message.add(message);
  }

  /// Adds multiple messages to local database in a single batch transaction.
  Future<bool> addMultiple(List<Map<String, dynamic>> messages) async {
    if (messages.isEmpty) return true;
    return AppDatabase.instance.message.addMultiple(messages);
  }
}
