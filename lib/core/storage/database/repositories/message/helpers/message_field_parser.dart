/// Centralized parser and normalization helpers for message fields across
/// database repositories and stores.
class MessageFieldParser {
  MessageFieldParser._();

  /// Safely converts a dynamic ID into an integer.
  static int parseId(dynamic id) {
    if (id is int) return id;
    if (id is num) return id.toInt();
    if (id is String) return int.tryParse(id) ?? 0;
    return 0;
  }

  /// Extracts message ID checking both 'id' and 'messageID'.
  static int parseMessageId(Map<String, dynamic> map) {
    return parseId(map['id'] ?? map['messageID']);
  }

  /// Safely converts dynamic subID into an integer (defaults to 0).
  static int parseSubID(dynamic subID) {
    if (subID is num) return subID.toInt();
    if (subID is String) return int.tryParse(subID) ?? 0;
    return 0;
  }

  /// Extracts sender / user UUID checking 'senderUUID', 'userUUID', and 'sender_uuid'.
  static String? parseSenderUUID(Map<String, dynamic> map) {
    final raw = map['senderUUID'] ?? map['userUUID'] ?? map['sender_uuid'];
    if (raw == null) return null;
    return raw.toString();
  }

  /// Extracts chat UUID checking 'chatUUID' and 'chat_uuid'.
  static String? parseChatUUID(Map<String, dynamic> map) {
    final raw = map['chatUUID'] ?? map['chat_uuid'];
    if (raw == null) return null;
    return raw.toString();
  }

  /// Safely parses boolean values accepting true, 1, 'true', '1'.
  static bool parseBool(dynamic val) {
    if (val == true || val == 1) return true;
    if (val is String) {
      final s = val.toLowerCase().trim();
      return s == 'true' || s == '1';
    }
    return false;
  }

  /// Checks whether a message map is marked as edited (handles bool and int 1).
  static bool isEdited(Map<String, dynamic> map) {
    return parseBool(map['edited']);
  }

  /// Checks whether a message map is marked as pinned (handles bool and int 1).
  static bool isPinned(Map<String, dynamic> map) {
    return parseBool(map['pinned']);
  }

  /// Checks whether a message map is marked as favorited (handles bool and int 1).
  static bool isFavorited(Map<String, dynamic> map) {
    return parseBool(map['favorited']);
  }

  /// Extracts created at string fallbacking between 'created_at' and 'createdAt'.
  static String parseCreatedAtString(
    Map<String, dynamic> map, [
    String? fallback,
  ]) {
    final raw = map['created_at'] ?? map['createdAt'];
    if (raw != null) {
      return raw.toString();
    }
    return fallback ?? DateTime.now().toIso8601String();
  }

  /// Safely converts a dynamic value into a DateTime object.
  static DateTime parseCreatedAtDateTime(dynamic rawCreatedAt) {
    if (rawCreatedAt is DateTime) return rawCreatedAt;
    if (rawCreatedAt is String && rawCreatedAt.isNotEmpty) {
      try {
        return DateTime.parse(rawCreatedAt);
      } catch (_) {}
    }
    if (rawCreatedAt is int) {
      try {
        return DateTime.fromMillisecondsSinceEpoch(
          rawCreatedAt > 1000000000000 ? rawCreatedAt : rawCreatedAt * 1000,
        );
      } catch (_) {}
    }
    return DateTime.now();
  }

  /// Parses a generic list of maps safely.
  static List<Map<String, dynamic>> parseMapList(dynamic val) {
    if (val is List) {
      return val
          .whereType<Map>()
          .map((m) => Map<String, dynamic>.from(m))
          .toList();
    }
    return const [];
  }
}
