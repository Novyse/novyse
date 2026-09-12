import 'package:intl/intl.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/stores/message_store.dart';

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

/// Formats message text / preview content (e.g. attachments, GIFs, system messages).
Map<String, dynamic> formatMessage(
  dynamic messageRef, {
  required AppLocalizations l10n,
  String? localUserUUID,
  Map<String, dynamic>? Function(String uuid)? getUser,
}) {
  final Map<String, dynamic> message = messageRef is MessageModel
      ? messageRef.toMap()
      : (messageRef is Map
            ? Map<String, dynamic>.from(messageRef)
            : <String, dynamic>{});
  final type = message['type'] as String?;

  if (type == 'system') {
    message['content'] = getSystemMessageText(
      message,
      l10n: l10n,
      localUserUUID: localUserUUID,
      getUser: getUser,
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

          final (emoji, singular, plural) = switch (cat) {
            FileTypeCategory.image => (
              '📷',
              l10n.msgFormatPhotoSingular,
              l10n.msgFormatPhotoPlural,
            ),
            FileTypeCategory.video => (
              '📹',
              l10n.msgFormatVideoSingular,
              l10n.msgFormatVideoPlural,
            ),
            FileTypeCategory.audio => (
              '🎵',
              l10n.msgFormatAudioSingular,
              l10n.msgFormatAudioPlural,
            ),
            FileTypeCategory.voice => (
              '🎤',
              l10n.msgFormatVoiceSingular,
              l10n.msgFormatVoicePlural,
            ),
            FileTypeCategory.document => (
              '📄',
              l10n.msgFormatDocumentSingular,
              l10n.msgFormatDocumentPlural,
            ),
            FileTypeCategory.code => (
              '💻',
              l10n.msgFormatCodeSingular,
              l10n.msgFormatCodePlural,
            ),
            FileTypeCategory.archive => (
              '🗄️',
              l10n.msgFormatArchiveSingular,
              l10n.msgFormatArchivePlural,
            ),
            FileTypeCategory.other => (
              '📎',
              l10n.msgFormatFileSingular,
              l10n.msgFormatFilePlural,
            ),
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
              ? '$emoji $singular$durationStr'
              : '$count $emoji $plural';
        } else {
          final hasOnlyMedia = uniqueCategories.every(
            (c) => c == FileTypeCategory.image || c == FileTypeCategory.video,
          );
          message['content'] = hasOnlyMedia
              ? '${files.length} 📎 ${l10n.msgFormatMedia}'
              : '${files.length} 📎 ${l10n.msgFormatFiles}';
        }
      }
    } else {
      final gifUrls = extractGifUrls(content);
      final textWithoutGifs = stripGifUrls(content);
      if (gifUrls.isNotEmpty && textWithoutGifs.isEmpty) {
        message['content'] = gifUrls.length == 1
            ? '🎞️ ${l10n.msgFormatGifSingular}'
            : '${gifUrls.length} 🎞️ ${l10n.msgFormatGifPlural}';
      }
    }
  }

  return message;
}

/// Formats readable system action text for system messages.
String getSystemMessageText(
  Map<String, dynamic> message, {
  required AppLocalizations l10n,
  String? localUserUUID,
  Map<String, dynamic>? Function(String uuid)? getUser,
}) {
  final action = message['system_action'] as String?;
  final content = (message['content'] ?? '') as String;

  String resolveName() {
    if (content == localUserUUID) return l10n.chatYou;
    final user = getUser?.call(content);
    return (user?['name'] as String?) ?? l10n.user;
  }

  switch (action) {
    case 'CHAT_CREATED':
      return l10n.msgFormatChatCreated;
    case 'USER_JOINED':
      return l10n.msgFormatUserJoined(resolveName());
    case 'USER_LEFT':
      return l10n.msgFormatUserLeft(resolveName());
    default:
      return l10n.msgFormatSystemMessage;
  }
}

/// Formats typing and member activity data.
String formatActivity(
  List<dynamic> memberActivityData, {
  required AppLocalizations l10n,
  String? localUserUUID,
  Map<String, dynamic>? Function(String uuid)? getUser,
}) {
  if (memberActivityData.isEmpty) return '';

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
    return (user?['name'] as String?) ?? l10n.user;
  }).toList();

  final name = names[0];
  final name2 = count > 1 ? names[1] : '';
  final others = count - 2;

  switch (majorityAction) {
    case 'TYPING':
      if (count == 1) return l10n.msgFormatTypingOne(name);
      if (count == 2) return l10n.msgFormatTypingTwo(name, name2);
      return l10n.msgFormatTypingOther(name, name2, others);
    case 'RECORDING_VOICE':
      if (count == 1) return l10n.msgFormatRecordingVoiceOne(name);
      if (count == 2) return l10n.msgFormatRecordingVoiceTwo(name, name2);
      return l10n.msgFormatRecordingVoiceOther(name, name2, others);
    case 'RECORDING_VIDEO':
      if (count == 1) return l10n.msgFormatRecordingVideoOne(name);
      if (count == 2) return l10n.msgFormatRecordingVideoTwo(name, name2);
      return l10n.msgFormatRecordingVideoOther(name, name2, others);
    case 'UPLOADING_FILE':
      if (count == 1) return l10n.msgFormatUploadingFileOne(name);
      if (count == 2) return l10n.msgFormatUploadingFileTwo(name, name2);
      return l10n.msgFormatUploadingFileOther(name, name2, others);
    default:
      if (count == 1) return l10n.msgFormatActiveOne(name);
      if (count == 2) return l10n.msgFormatActiveTwo(name, name2);
      return l10n.msgFormatActiveOther(name, name2, others);
  }
}

/// Formats relative time for user "last seen" status.
String formatLastSeen(
  dynamic lastAccessAt, {
  required AppLocalizations l10n,
}) {
  if (lastAccessAt == null) return '';

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
      return l10n.msgFormatJustNow;
    }
    if (diff.inSeconds < 60) {
      return l10n.msgFormatSecondsAgo(diff.inSeconds);
    }
    if (diff.inMinutes < 60) {
      return l10n.msgFormatMinutesAgo(diff.inMinutes);
    }
    if (diff.inHours < 24) {
      return l10n.msgFormatHoursAgo(diff.inHours);
    }
    if (diff.inDays == 1) {
      return l10n.msgFormatYesterday;
    }
    if (diff.inDays < 7) {
      return l10n.msgFormatDaysAgo(diff.inDays);
    }

    return DateFormat.yMd(l10n.localeName).format(date);
  } catch (_) {
    return '';
  }
}
