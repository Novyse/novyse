import 'package:novyse/core/storage/file/file_type.dart';

final RegExp _gifUrlRegex = RegExp(
  r'''https?://[^\s<>"'`]+?\.gif(?:\?[^\s<>"'`]*)?''',
  caseSensitive: false,
);

String _normalizeGifUrl(String raw) {
  return raw
      .trim()
      .replaceAll(RegExp(r'[),.;!?]+$'), '')
      .replaceFirst(RegExp(r'^http:'), 'https:');
}

/// Extracts unique GIF URLs from string content.
List<String> extractGifUrls(String? content) {
  if (content == null || content.isEmpty) return [];
  final matches = _gifUrlRegex.allMatches(content);
  final seen = <String>{};
  final result = <String>[];

  for (final match in matches) {
    final raw = match.group(0);
    if (raw != null) {
      final url = _normalizeGifUrl(raw);
      if (seen.add(url)) {
        result.add(url);
      }
    }
  }
  return result;
}

/// Strips all GIF URLs from the message text.
String stripGifUrls(String? content) {
  if (content == null || content.isEmpty) return '';
  return content
      .replaceAll(_gifUrlRegex, ' ')
      .replaceAll(RegExp(r'[ \t]+\n'), '\n')
      .replaceAll(RegExp(r'\n{3,}'), '\n\n')
      .replaceAll(RegExp(r'[ \t]{2,}'), ' ')
      .trim();
}

/// Returns the normalized GIF URL if the string points to a valid GIF.
String? getGifMediaUrl(String? url) {
  if (url == null || url.isEmpty) return null;
  final normalized = _normalizeGifUrl(url);
  if (RegExp(r'\.gif(?:\?|$)', caseSensitive: false).hasMatch(normalized)) {
    return normalized;
  }
  return null;
}

typedef TranslationCallback = String Function(String key, [Map<String, dynamic>? params]);

/// Default fallback translator for message formatting strings.
String _defaultTranslate(String key, [Map<String, dynamic>? params]) {
  switch (key) {
    case 'messageFormat.fileType.image.singular':
      return 'Photo';
    case 'messageFormat.fileType.image.plural':
      return 'Photos';
    case 'messageFormat.fileType.video.singular':
      return 'Video';
    case 'messageFormat.fileType.video.plural':
      return 'Videos';
    case 'messageFormat.fileType.audio.singular':
      return 'Audio';
    case 'messageFormat.fileType.audio.plural':
      return 'Audios';
    case 'messageFormat.fileType.voice.singular':
      return 'Voice message';
    case 'messageFormat.fileType.voice.plural':
      return 'Voice messages';
    case 'messageFormat.fileType.document.singular':
      return 'Document';
    case 'messageFormat.fileType.document.plural':
      return 'Documents';
    case 'messageFormat.fileType.code.singular':
      return 'Code snippet';
    case 'messageFormat.fileType.code.plural':
      return 'Code snippets';
    case 'messageFormat.fileType.archive.singular':
      return 'Archive';
    case 'messageFormat.fileType.archive.plural':
      return 'Archives';
    case 'messageFormat.fileType.gif.singular':
      return 'GIF';
    case 'messageFormat.fileType.gif.plural':
      return 'GIFs';
    case 'messageFormat.fileType.default.singular':
      return 'File';
    case 'messageFormat.fileType.default.plural':
      return 'Files';
    case 'messageFormat.media':
      return 'Media';
    case 'messageFormat.files':
      return 'Files';
    case 'messageFormat.system.chatCreated':
      return 'Chat created';
    case 'messageFormat.system.you':
      return 'You';
    case 'messageFormat.system.user':
      return 'User';
    case 'messageFormat.system.userJoined':
      final name = params?['name'] ?? 'User';
      return '$name joined the chat';
    case 'messageFormat.system.userLeft':
      final name = params?['name'] ?? 'User';
      return '$name left the chat';
    case 'messageFormat.system.systemMessage':
      return 'System message';
    case 'messageFormat.time.justNow':
      return 'Just now';
    case 'messageFormat.time.yesterday':
      return 'Yesterday';
    case 'messageFormat.time.secondsAgo':
      final c = params?['count'] ?? 0;
      return '${c}s ago';
    case 'messageFormat.time.minutesAgo':
      final c = params?['count'] ?? 0;
      return '${c}m ago';
    case 'messageFormat.time.hoursAgo':
      final c = params?['count'] ?? 0;
      return '${c}h ago';
    case 'messageFormat.time.daysAgo':
      final c = params?['count'] ?? 0;
      return '${c}d ago';
    case 'messageFormat.activity.typing_one':
      final name = params?['name'] ?? 'User';
      return '$name is typing...';
    case 'messageFormat.activity.typing_two':
      final name = params?['name'] ?? 'User';
      final name2 = params?['name2'] ?? 'User';
      return '$name and $name2 are typing...';
    case 'messageFormat.activity.typing_other':
      final name = params?['name'] ?? 'User';
      final name2 = params?['name2'] ?? 'User';
      final count = params?['count'] ?? 0;
      return '$name, $name2 and $count others are typing...';
    case 'messageFormat.activity.recording_voice_one':
      final name = params?['name'] ?? 'User';
      return '$name is recording voice...';
    case 'messageFormat.activity.recording_voice_two':
      final name = params?['name'] ?? 'User';
      final name2 = params?['name2'] ?? 'User';
      return '$name and $name2 are recording voice...';
    case 'messageFormat.activity.recording_voice_other':
      final name = params?['name'] ?? 'User';
      final name2 = params?['name2'] ?? 'User';
      final count = params?['count'] ?? 0;
      return '$name, $name2 and $count others are recording voice...';
    default:
      return key;
  }
}

/// Formats message text / preview content (e.g. attachments, GIFs, system messages).
Map<String, dynamic> formatMessage(
  Map<String, dynamic> messageRef, {
  String? localUserUUID,
  Map<String, dynamic>? Function(String uuid)? getUser,
  TranslationCallback? t,
}) {
  final translate = t ?? _defaultTranslate;
  final message = Map<String, dynamic>.from(messageRef);
  final type = message['type'] as String?;

  if (type == 'system') {
    message['content'] = getSystemMessageText(
      message,
      localUserUUID: localUserUUID,
      getUser: getUser,
      t: translate,
    );
  } else if (type == 'message' || type == 'DRAFT') {
    final content = message['content'] as String?;
    if (content == null || content.trim().isEmpty) {
      final files = message['files'];
      if (files is List && files.isNotEmpty) {
        final fileCategories = <FileTypeCategory>[];
        for (final f in files) {
          if (f is Map) {
            final mime = (f['mimeType'] ?? f['type'] ?? '') as String;
            final name = (f['name'] ?? f['fileName'] ?? '') as String;
            fileCategories.add(getFileType(mime, name));
          }
        }

        final uniqueCategories = fileCategories.toSet().toList();
        if (uniqueCategories.length == 1) {
          final cat = uniqueCategories.first;
          final count = fileCategories.length;

          final (emoji, singularKey, pluralKey) = switch (cat) {
            FileTypeCategory.image => ('📷', 'messageFormat.fileType.image.singular', 'messageFormat.fileType.image.plural'),
            FileTypeCategory.video => ('📹', 'messageFormat.fileType.video.singular', 'messageFormat.fileType.video.plural'),
            FileTypeCategory.audio => ('🎵', 'messageFormat.fileType.audio.singular', 'messageFormat.fileType.audio.plural'),
            FileTypeCategory.voice => ('🎤', 'messageFormat.fileType.voice.singular', 'messageFormat.fileType.voice.plural'),
            FileTypeCategory.document => ('📄', 'messageFormat.fileType.document.singular', 'messageFormat.fileType.document.plural'),
            FileTypeCategory.code => ('💻', 'messageFormat.fileType.code.singular', 'messageFormat.fileType.code.plural'),
            FileTypeCategory.archive => ('🗄️', 'messageFormat.fileType.archive.singular', 'messageFormat.fileType.archive.plural'),
            FileTypeCategory.other => ('📎', 'messageFormat.fileType.default.singular', 'messageFormat.fileType.default.plural'),
          };

          var durationStr = '';
          if (count == 1 &&
              (cat == FileTypeCategory.audio ||
                  cat == FileTypeCategory.video ||
                  cat == FileTypeCategory.voice)) {
            final file = files.first;
            if (file is Map && file['duration'] != null) {
              final seconds = (file['duration'] as num).toInt();
              final m = seconds ~/ 60;
              final s = seconds % 60;
              durationStr = ' $m:${s.toString().padLeft(2, '0')}';
            }
          }

          message['content'] = count == 1
              ? '$emoji ${translate(singularKey)}$durationStr'
              : '$count $emoji ${translate(pluralKey)}';
        } else {
          final hasOnlyMedia = uniqueCategories.every(
            (c) => c == FileTypeCategory.image || c == FileTypeCategory.video,
          );
          message['content'] = hasOnlyMedia
              ? '${files.length} 📎 ${translate("messageFormat.media")}'
              : '${files.length} 📎 ${translate("messageFormat.files")}';
        }
      }
    } else {
      final gifUrls = extractGifUrls(content);
      final textWithoutGifs = stripGifUrls(content);
      if (gifUrls.isNotEmpty && textWithoutGifs.isEmpty) {
        message['content'] = gifUrls.length == 1
            ? '🎞️ ${translate("messageFormat.fileType.gif.singular")}'
            : '${gifUrls.length} 🎞️ ${translate("messageFormat.fileType.gif.plural")}';
      }
    }
  }

  return message;
}

/// Formats readable system action text for system messages.
String getSystemMessageText(
  Map<String, dynamic> message, {
  String? localUserUUID,
  Map<String, dynamic>? Function(String uuid)? getUser,
  TranslationCallback? t,
}) {
  final translate = t ?? _defaultTranslate;
  final action = message['system_action'] as String?;
  final content = (message['content'] ?? '') as String;

  switch (action) {
    case 'CHAT_CREATED':
      return translate('messageFormat.system.chatCreated');
    case 'USER_JOINED':
      String name;
      if (content == localUserUUID) {
        name = translate('messageFormat.system.you');
      } else {
        final user = getUser?.call(content);
        name = (user?['name'] as String?) ?? translate('messageFormat.system.user');
      }
      return translate('messageFormat.system.userJoined', {'name': name});
    case 'USER_LEFT':
      String name;
      if (content == localUserUUID) {
        name = translate('messageFormat.system.you');
      } else {
        final user = getUser?.call(content);
        name = (user?['name'] as String?) ?? translate('messageFormat.system.user');
      }
      return translate('messageFormat.system.userLeft', {'name': name});
    default:
      return translate('messageFormat.system.systemMessage');
  }
}

/// Formats typing and member activity data.
String formatActivity(
  List<dynamic> memberActivityData, {
  String? localUserUUID,
  Map<String, dynamic>? Function(String uuid)? getUser,
  TranslationCallback? t,
}) {
  if (memberActivityData.isEmpty) return '';
  final translate = t ?? _defaultTranslate;

  final activeActivities = memberActivityData.where((a) {
    if (a is! Map) return false;
    final action = a['action'];
    final userUUID = a['userUUID'];
    return action != null && userUUID != localUserUUID;
  }).toList();

  if (activeActivities.isEmpty) return '';

  final actionsMap = <String, List<Map<String, dynamic>>>{};
  final actionOrder = <String>[];

  for (final a in activeActivities) {
    final item = Map<String, dynamic>.from(a as Map);
    final action = item['action'] as String;
    if (!actionsMap.containsKey(action)) {
      actionsMap[action] = [];
      actionOrder.add(action);
    }
    actionsMap[action]!.add(item);
  }

  var majorityAction = actionOrder.first;
  var maxCount = actionsMap[majorityAction]!.length;

  for (final action in actionOrder) {
    final count = actionsMap[action]!.length;
    if (count > maxCount) {
      maxCount = count;
      majorityAction = action;
    }
  }

  final participants = actionsMap[majorityAction]!;
  final count = participants.length;
  final names = participants.map((p) {
    final uuid = (p['userUUID'] ?? '') as String;
    final user = getUser?.call(uuid);
    return (user?['name'] as String?) ?? translate('messageFormat.system.user');
  }).toList();

  final actionKey = switch (majorityAction) {
    'TYPING' => 'typing',
    'RECORDING_VOICE' => 'recording_voice',
    'RECORDING_VIDEO' => 'recording_video',
    'UPLOADING_FILE' => 'uploading_file',
    _ => 'active',
  };

  if (count == 1) {
    return translate('messageFormat.activity.${actionKey}_one', {'name': names[0]});
  } else if (count == 2) {
    return translate(
      'messageFormat.activity.${actionKey}_two',
      {'name': names[0], 'name2': names[1]},
    );
  } else {
    return translate(
      'messageFormat.activity.${actionKey}_other',
      {'name': names[0], 'name2': names[1], 'count': count - 2},
    );
  }
}

/// Formats relative time for user "last seen" status.
String formatLastSeen(
  dynamic lastAccessAt, {
  TranslationCallback? t,
}) {
  if (lastAccessAt == null) return '';
  final translate = t ?? _defaultTranslate;

  try {
    DateTime date;
    if (lastAccessAt is DateTime) {
      date = lastAccessAt.toLocal();
    } else if (lastAccessAt is String) {
      date = DateTime.parse(lastAccessAt).toLocal();
    } else if (lastAccessAt is int) {
      date = DateTime.fromMillisecondsSinceEpoch(lastAccessAt).toLocal();
    } else {
      return '';
    }

    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inSeconds < 10) {
      return translate('messageFormat.time.justNow');
    }
    if (diff.inSeconds < 60) {
      return translate('messageFormat.time.secondsAgo', {'count': diff.inSeconds});
    }
    if (diff.inMinutes < 60) {
      return translate('messageFormat.time.minutesAgo', {'count': diff.inMinutes});
    }
    if (diff.inHours < 24) {
      return translate('messageFormat.time.hoursAgo', {'count': diff.inHours});
    }
    if (diff.inDays == 1) {
      return translate('messageFormat.time.yesterday');
    }
    if (diff.inDays < 7) {
      return translate('messageFormat.time.daysAgo', {'count': diff.inDays});
    }

    final month = date.month.toString().padLeft(2, '0');
    final day = date.day.toString().padLeft(2, '0');
    return '${date.year}-$month-$day';
  } catch (_) {
    return '';
  }
}
