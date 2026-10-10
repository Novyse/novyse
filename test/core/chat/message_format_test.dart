import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';
import 'package:novyse/core/chat/message_format.dart';
import 'package:novyse/core/l10n/app_localizations.dart';
import 'package:novyse/core/l10n/app_localizations_en.dart';
import 'package:novyse/core/l10n/app_localizations_it.dart';

/// Covers the `message_format` branches the existing `chat_test.dart` leaves
/// out: the GIF url helper, every attachment-category arm, the non-typing
/// activity strings, and the four-way date parsing plus both date ladders.
void main() {
  final en = AppLocalizationsEn();
  final it = AppLocalizationsIt();

  // The absolute-date branches format with an explicit locale, which intl only
  // supports once its date symbols have been loaded.
  setUpAll(() {
    initializeDateFormatting('en', null);
    initializeDateFormatting('it', null);
  });

  /// Formats an attachment-only message and returns the preview text.
  String preview(
    List<Map<String, dynamic>> files, {
    required AppLocalizations l10n,
  }) =>
      formatMessage({'type': 'message', 'files': files}, l10n: l10n)['content']
          as String;

  group('getGifMediaUrl', () {
    test('accepts a .gif url', () {
      expect(
        getGifMediaUrl('https://cdn.test/a.gif'),
        'https://cdn.test/a.gif',
      );
    });

    test('accepts a query string after the extension', () {
      expect(
        getGifMediaUrl('https://cdn.test/a.gif?token=1'),
        'https://cdn.test/a.gif?token=1',
      );
    });

    test('is case-insensitive about the extension', () {
      expect(
        getGifMediaUrl('https://cdn.test/a.GIF'),
        'https://cdn.test/a.GIF',
      );
    });

    test('rejects a non-gif url', () {
      expect(getGifMediaUrl('https://cdn.test/a.png'), isNull);
    });

    test('rejects a gif that is only in the middle of the path', () {
      expect(getGifMediaUrl('https://cdn.test/gif/a.png'), isNull);
    });

    test('returns null for null and empty', () {
      expect(getGifMediaUrl(null), isNull);
      expect(getGifMediaUrl(''), isNull);
    });
  });

  group('stripGifUrls', () {
    test('collapses the whitespace left behind by the removed url', () {
      expect(stripGifUrls('a  https://cdn.test/a.gif  b'), 'a b');
    });

    test('collapses runs of blank lines', () {
      expect(stripGifUrls('a\n\n\n\n\nb'), 'a\n\nb');
    });

    test('leaves plain text untouched', () {
      expect(stripGifUrls('just text'), 'just text');
    });
  });

  group('attachment previews', () {
    test('single image', () {
      expect(
        preview([
          {'mimeType': 'image/png', 'name': 'a.png'},
        ], l10n: en),
        '📷 ${en.msgFormatPhotoSingular}',
      );
    });

    test('multiple images', () {
      expect(
        preview([
          {'mimeType': 'image/png', 'name': 'a.png'},
          {'mimeType': 'image/jpeg', 'name': 'b.jpg'},
        ], l10n: en),
        '2 📷 ${en.msgFormatPhotoPlural}',
      );
    });

    test('single video', () {
      expect(
        preview([
          {'mimeType': 'video/mp4', 'name': 'a.mp4'},
        ], l10n: en),
        '📹 ${en.msgFormatVideoSingular}',
      );
    });

    test('multiple videos', () {
      expect(
        preview([
          {'mimeType': 'video/mp4', 'name': 'a.mp4'},
          {'mimeType': 'video/webm', 'name': 'b.webm'},
        ], l10n: en),
        '2 📹 ${en.msgFormatVideoPlural}',
      );
    });

    test('single audio', () {
      expect(
        preview([
          {'mimeType': 'audio/mpeg', 'name': 'a.mp3'},
        ], l10n: en),
        '🎵 ${en.msgFormatAudioSingular}',
      );
    });

    test('multiple audio', () {
      expect(
        preview([
          {'mimeType': 'audio/mpeg', 'name': 'a.mp3'},
          {'mimeType': 'audio/flac', 'name': 'b.flac'},
        ], l10n: en),
        '2 🎵 ${en.msgFormatAudioPlural}',
      );
    });

    test('single voice note', () {
      expect(
        preview([
          {'mimeType': 'audio/wav', 'name': 'novyse_vocal_1.wav'},
        ], l10n: en),
        '🎤 ${en.msgFormatVoiceSingular}',
      );
    });

    test('multiple voice notes', () {
      expect(
        preview([
          {'mimeType': 'audio/wav', 'name': 'novyse_vocal_1.wav'},
          {'mimeType': 'audio/aac', 'name': 'novyse_vocal_2.aac'},
        ], l10n: en),
        '2 🎤 ${en.msgFormatVoicePlural}',
      );
    });

    test('single document', () {
      expect(
        preview([
          {'mimeType': 'application/pdf', 'name': 'a.pdf'},
        ], l10n: en),
        '📄 ${en.msgFormatDocumentSingular}',
      );
    });

    test('multiple documents', () {
      expect(
        preview([
          {'mimeType': 'application/pdf', 'name': 'a.pdf'},
          {'mimeType': 'text/plain', 'name': 'b.txt'},
        ], l10n: en),
        '2 📄 ${en.msgFormatDocumentPlural}',
      );
    });

    test('single code file', () {
      expect(
        preview([
          {'mimeType': 'application/json', 'name': 'a.json'},
        ], l10n: en),
        '💻 ${en.msgFormatCodeSingular}',
      );
    });

    test('multiple code files', () {
      expect(
        preview([
          {'mimeType': 'application/json', 'name': 'a.json'},
          {'mimeType': 'text/markdown', 'name': 'b.md'},
        ], l10n: en),
        '2 💻 ${en.msgFormatCodePlural}',
      );
    });

    test('single archive', () {
      expect(
        preview([
          {'mimeType': 'application/zip', 'name': 'a.zip'},
        ], l10n: en),
        '🗄️ ${en.msgFormatArchiveSingular}',
      );
    });

    test('multiple archives', () {
      expect(
        preview([
          {'mimeType': 'application/zip', 'name': 'a.zip'},
          {'mimeType': 'application/gzip', 'name': 'b.gz'},
        ], l10n: en),
        '2 🗄️ ${en.msgFormatArchivePlural}',
      );
    });

    test('single unknown file', () {
      expect(
        preview([
          {'mimeType': 'application/x-weird', 'name': 'a.weird'},
        ], l10n: en),
        '📎 ${en.msgFormatFileSingular}',
      );
    });

    test('multiple unknown files', () {
      expect(
        preview([
          {'mimeType': 'application/x-weird', 'name': 'a.weird'},
          {'mimeType': 'application/x-other', 'name': 'b.other'},
        ], l10n: en),
        '2 📎 ${en.msgFormatFilePlural}',
      );
    });

    test('mixed image and video counts as media', () {
      expect(
        preview([
          {'mimeType': 'image/png', 'name': 'a.png'},
          {'mimeType': 'video/mp4', 'name': 'b.mp4'},
        ], l10n: en),
        '2 📎 ${en.msgFormatMedia}',
      );
    });

    test('mixed image and document counts as files', () {
      expect(
        preview([
          {'mimeType': 'image/png', 'name': 'a.png'},
          {'mimeType': 'application/pdf', 'name': 'b.pdf'},
        ], l10n: en),
        '2 📎 ${en.msgFormatFiles}',
      );
    });

    test('shows the duration for a single video', () {
      expect(
        preview([
          {'mimeType': 'video/mp4', 'name': 'a.mp4', 'duration': 125},
        ], l10n: en),
        '📹 ${en.msgFormatVideoSingular} 2:05',
      );
    });

    test('shows the duration for a single audio file', () {
      expect(
        preview([
          {'mimeType': 'audio/mpeg', 'name': 'a.mp3', 'duration': 65},
        ], l10n: en),
        '🎵 ${en.msgFormatAudioSingular} 1:05',
      );
    });

    test('omits the duration for a single image', () {
      expect(
        preview([
          {'mimeType': 'image/png', 'name': 'a.png', 'duration': 90},
        ], l10n: en),
        '📷 ${en.msgFormatPhotoSingular}',
      );
    });

    test('omits the duration when several files are present', () {
      expect(
        preview([
          {'mimeType': 'video/mp4', 'name': 'a.mp4', 'duration': 90},
          {'mimeType': 'video/webm', 'name': 'b.webm', 'duration': 90},
        ], l10n: en),
        '2 📹 ${en.msgFormatVideoPlural}',
      );
    });

    test('falls back to the fileName and type keys', () {
      expect(
        preview([
          {'type': 'image/gif', 'fileName': 'a.gif'},
        ], l10n: en),
        '📷 ${en.msgFormatPhotoSingular}',
      );
    });

    test('localizes the preview', () {
      expect(
        preview([
          {'mimeType': 'image/png', 'name': 'a.png'},
        ], l10n: it),
        '📷 ${it.msgFormatPhotoSingular}',
      );
    });

    test('leaves the content alone when it has text', () {
      expect(
        formatMessage({
          'type': 'message',
          'content': 'look',
          'files': [
            {'mimeType': 'image/png', 'name': 'a.png'},
          ],
        }, l10n: en)['content'],
        'look',
      );
    });

    test('handles a single gif', () {
      expect(
        formatMessage({
          'type': 'message',
          'content': 'https://cdn.test/a.gif',
        }, l10n: en)['content'],
        '🎞️ ${en.msgFormatGifSingular}',
      );
    });

    test('handles several gifs', () {
      expect(
        formatMessage({
          'type': 'message',
          'content': 'https://cdn.test/a.gif https://cdn.test/b.gif',
        }, l10n: en)['content'],
        '2 🎞️ ${en.msgFormatGifPlural}',
      );
    });

    test('keeps the text when a gif is mixed with words', () {
      expect(
        formatMessage({
          'type': 'message',
          'content': 'look https://cdn.test/a.gif',
        }, l10n: en)['content'],
        'look https://cdn.test/a.gif',
      );
    });

    test('treats a DRAFT like a message', () {
      expect(
        preview([
          {'mimeType': 'image/png', 'name': 'a.png'},
        ], l10n: en),
        '📷 ${en.msgFormatPhotoSingular}',
      );
    });

    test('formats a DRAFT with text', () {
      expect(
        formatMessage({
          'type': 'DRAFT',
          'content': 'draft text',
        }, l10n: en)['content'],
        'draft text',
      );
    });

    test('returns an empty map for a non-map, non-model argument', () {
      expect(formatMessage('nope', l10n: en), isEmpty);
    });
  });

  group('formatActivity', () {
    final users = {
      'u1': {'name': 'Ada'},
      'u2': {'name': 'Grace'},
      'u3': {'name': 'Alan'},
    };
    Map<String, dynamic>? getUser(String uuid) => users[uuid];

    List<Map<String, dynamic>> activity(String action, List<String> uuids) => [
      for (final uuid in uuids) {'action': action, 'userUUID': uuid},
    ];

    test('returns empty for no activity', () {
      expect(formatActivity([], l10n: en), '');
    });

    test('returns empty when only the local user is active', () {
      expect(
        formatActivity(
          activity('TYPING', ['me']),
          l10n: en,
          localUserUUID: 'me',
          getUser: getUser,
        ),
        '',
      );
    });

    test('returns empty when an entry has no action', () {
      expect(
        formatActivity(
          [
            {'userUUID': 'u1'},
          ],
          l10n: en,
          getUser: getUser,
        ),
        '',
      );
    });

    test('ignores non-map entries', () {
      expect(
        formatActivity(
          [
            'nope',
            ...activity('TYPING', ['u1']),
          ],
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatTypingOne('Ada'),
      );
    });

    test('typing for one, two and three members', () {
      expect(
        formatActivity(activity('TYPING', ['u1']), l10n: en, getUser: getUser),
        en.msgFormatTypingOne('Ada'),
      );
      expect(
        formatActivity(
          activity('TYPING', ['u1', 'u2']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatTypingTwo('Ada', 'Grace'),
      );
      expect(
        formatActivity(
          activity('TYPING', ['u1', 'u2', 'u3']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatTypingOther('Ada', 'Grace', 1),
      );
    });

    test('recording voice for one, two and three members', () {
      expect(
        formatActivity(
          activity('RECORDING_VOICE', ['u1']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatRecordingVoiceOne('Ada'),
      );
      expect(
        formatActivity(
          activity('RECORDING_VOICE', ['u1', 'u2']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatRecordingVoiceTwo('Ada', 'Grace'),
      );
      expect(
        formatActivity(
          activity('RECORDING_VOICE', ['u1', 'u2', 'u3']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatRecordingVoiceOther('Ada', 'Grace', 1),
      );
    });

    test('recording video for one, two and three members', () {
      expect(
        formatActivity(
          activity('RECORDING_VIDEO', ['u1']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatRecordingVideoOne('Ada'),
      );
      expect(
        formatActivity(
          activity('RECORDING_VIDEO', ['u1', 'u2']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatRecordingVideoTwo('Ada', 'Grace'),
      );
      expect(
        formatActivity(
          activity('RECORDING_VIDEO', ['u1', 'u2', 'u3']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatRecordingVideoOther('Ada', 'Grace', 1),
      );
    });

    test('uploading a file for one, two and three members', () {
      expect(
        formatActivity(
          activity('UPLOADING_FILE', ['u1']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatUploadingFileOne('Ada'),
      );
      expect(
        formatActivity(
          activity('UPLOADING_FILE', ['u1', 'u2']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatUploadingFileTwo('Ada', 'Grace'),
      );
      expect(
        formatActivity(
          activity('UPLOADING_FILE', ['u1', 'u2', 'u3']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatUploadingFileOther('Ada', 'Grace', 1),
      );
    });

    test('an unknown action falls back to the generic phrasing', () {
      expect(
        formatActivity(
          activity('SOMETHING_ELSE', ['u1']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatActiveOne('Ada'),
      );
      expect(
        formatActivity(
          activity('SOMETHING_ELSE', ['u1', 'u2']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatActiveTwo('Ada', 'Grace'),
      );
      expect(
        formatActivity(
          activity('SOMETHING_ELSE', ['u1', 'u2', 'u3']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatActiveOther('Ada', 'Grace', 1),
      );
    });

    test('picks the action the most members share', () {
      final mixed = [
        ...activity('TYPING', ['u1', 'u2']),
        ...activity('RECORDING_VOICE', ['u3']),
      ];

      expect(
        formatActivity(mixed, l10n: en, getUser: getUser),
        en.msgFormatTypingTwo('Ada', 'Grace'),
      );
    });

    test('skips a non-string action', () {
      expect(
        formatActivity(
          [
            {'action': 42, 'userUUID': 'u1'},
          ],
          l10n: en,
          getUser: getUser,
        ),
        '',
      );
    });

    test('falls back to the generic user label for an unknown uuid', () {
      expect(
        formatActivity(
          activity('TYPING', ['ghost']),
          l10n: en,
          getUser: getUser,
        ),
        en.msgFormatTypingOne(en.user),
      );
    });

    test('falls back to the generic user label without a resolver', () {
      expect(
        formatActivity(activity('TYPING', ['u1']), l10n: en),
        en.msgFormatTypingOne(en.user),
      );
    });
  });

  group('formatDateTime', () {
    test('passes a DateTime through, in local time', () {
      final date = DateTime(2026, 3, 4, 5, 6);
      expect(formatDateTime(date), date.toLocal());
    });

    test('parses an ISO string', () {
      expect(
        formatDateTime('2026-03-04T05:06:07Z'),
        DateTime.parse('2026-03-04T05:06:07Z').toLocal(),
      );
    });

    test('reads epoch milliseconds', () {
      expect(
        formatDateTime(1772600767000),
        DateTime.fromMillisecondsSinceEpoch(1772600767000).toLocal(),
      );
    });

    test('falls back to now for null', () {
      expect(
        formatDateTime(null).difference(DateTime.now()).inSeconds.abs(),
        lessThan(5),
      );
    });

    test('falls back to now for an unsupported type', () {
      expect(
        formatDateTime(<String>['a'])
            .difference(DateTime.now())
            .inSeconds
            .abs(),
        lessThan(5),
      );
    });
  });

  group('formatMessageDateTime', () {
    /// The same wall-clock day [days] calendar days back, so the date ladders
    /// cannot be thrown off by the current time of day.
    DateTime daysAgo(int days) {
      final now = DateTime.now();
      return DateTime(now.year, now.month, now.day - days, 12, 30);
    }

    test('shows only the time for today', () {
      final now = DateTime.now();
      expect(
        formatMessageDateTime(now, l10n: en),
        DateFormat('HH:mm').format(now),
      );
    });

    test('prefixes yesterday', () {
      final text = formatMessageDateTime(daysAgo(1), l10n: en);
      expect(text, startsWith('${en.msgFormatYesterday}, '));
    });

    test('shows a weekday name within the last week', () {
      final text = formatMessageDateTime(daysAgo(3), l10n: en);
      expect(text, isNot(startsWith(en.msgFormatYesterday)));
      expect(text, contains(RegExp(r'\d{2}:\d{2}$')));
    });

    test('shows a short date earlier in the same year', () {
      final text = formatMessageDateTime(daysAgo(40), l10n: en);
      expect(text, isNot(startsWith(en.msgFormatYesterday)));
      expect(text, contains(RegExp(r'\d{2}:\d{2}$')));
    });

    test('shows a long date in a previous year', () {
      final lastYear = DateTime.now().subtract(const Duration(days: 400));
      final text = formatMessageDateTime(lastYear, l10n: en);

      expect(text, contains('${lastYear.year}'));
      expect(text, contains(RegExp(r'\d{2}:\d{2}$')));
    });

    test('accepts an epoch int', () {
      final now = DateTime.now();
      expect(
        formatMessageDateTime(now.millisecondsSinceEpoch, l10n: en),
        DateFormat('HH:mm').format(now),
      );
    });
  });

  group('formatLastSeen', () {
    DateTime ago(Duration d) => DateTime.now().subtract(d);

    test('just now', () {
      expect(
        formatLastSeen(ago(const Duration(seconds: 3)), l10n: en),
        en.msgFormatJustNow,
      );
    });

    test('seconds ago', () {
      expect(
        formatLastSeen(ago(const Duration(seconds: 30)), l10n: en),
        en.msgFormatSecondsAgo(30),
      );
    });

    test('minutes ago', () {
      expect(
        formatLastSeen(ago(const Duration(minutes: 30)), l10n: en),
        en.msgFormatMinutesAgo(30),
      );
    });

    test('hours ago', () {
      expect(
        formatLastSeen(ago(const Duration(hours: 5)), l10n: en),
        en.msgFormatHoursAgo(5),
      );
    });

    test('yesterday', () {
      expect(
        formatLastSeen(ago(const Duration(days: 1, hours: 2)), l10n: en),
        en.msgFormatYesterday,
      );
    });

    test('days ago', () {
      expect(
        formatLastSeen(ago(const Duration(days: 4)), l10n: en),
        en.msgFormatDaysAgo(4),
      );
    });

    test('an absolute date beyond a week', () {
      final old = ago(const Duration(days: 30));
      expect(
        formatLastSeen(old, l10n: en),
        DateFormat.yMd(en.localeName).format(old),
      );
    });

    test('treats a null timestamp as now', () {
      expect(formatLastSeen(null, l10n: en), en.msgFormatJustNow);
    });
  });
}
