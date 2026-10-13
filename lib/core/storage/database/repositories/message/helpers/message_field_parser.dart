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
      return parseCreatedAtDateTime(raw).toUtc().toIso8601String();
    }
    return fallback ?? DateTime.now().toUtc().toIso8601String();
  }

  /// Safely converts a dynamic value into a DateTime object in local device time.
  /// All timestamps from server or DB are treated as UTC+0 based and converted to the device's timezone.
  static DateTime parseCreatedAtDateTime(dynamic rawCreatedAt) {
    if (rawCreatedAt == null) return DateTime.now();
    if (rawCreatedAt is DateTime) {
      return rawCreatedAt.toLocal();
    }
    if (rawCreatedAt is int) {
      try {
        final ms = rawCreatedAt > 1000000000000
            ? rawCreatedAt
            : rawCreatedAt * 1000;
        return DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true).toLocal();
      } catch (_) {}
    }
    if (rawCreatedAt is String && rawCreatedAt.trim().isNotEmpty) {
      final s = rawCreatedAt.trim();
      final asInt = int.tryParse(s);
      if (asInt != null) {
        final ms = asInt > 1000000000000 ? asInt : asInt * 1000;
        return DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true).toLocal();
      }
      try {
        final hasTime = s.contains(':');
        if (!hasTime) {
          final parsed = DateTime.tryParse(s);
          if (parsed != null) return parsed.toLocal();
        }
        final timePart = s.contains('T')
            ? s.split('T').last
            : (s.contains(' ') ? s.split(' ').last : '');
        final hasTimezone = s.endsWith('Z') ||
            s.endsWith('z') ||
            RegExp(r'[+-]\d{2}:?\d{2}$').hasMatch(timePart);
        final normalized = hasTimezone ? s : '${s.replaceFirst(' ', 'T')}Z';
        return DateTime.parse(normalized).toLocal();
      } catch (_) {
        try {
          return DateTime.parse(s).toLocal();
        } catch (_) {}
      }
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
