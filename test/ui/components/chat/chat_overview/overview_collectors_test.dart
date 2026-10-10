import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/ui/components/chat/chat_overview/overview_collectors.dart';

/// The overview tab derives its file/link lists and its size labels purely
/// from the loaded messages, so no providers or database are needed.
void main() {
  MessageModel message({
    int id = 1,
    String? content,
    List<Map<String, dynamic>>? files,
    DateTime? createdAt,
  }) => MessageModel(
    id: id,
    chatUUID: 'chat-1',
    subID: 0,
    userUUID: 'u1',
    content: content,
    type: 'message',
    files: files ?? const [],
    createdAt: createdAt ?? DateTime(2026, 1, 1),
  );

  group('collectOverviewFiles', () {
    test('flattens the files of every message', () {
      final files = collectOverviewFiles([
        message(
          files: [
            {'uuid': 'f1'},
            {'uuid': 'f2'},
          ],
        ),
        message(
          id: 2,
          files: [
            {'uuid': 'f3'},
          ],
        ),
      ]);

      expect(files.map((e) => e.file['uuid']), ['f1', 'f2', 'f3']);
    });

    test('sorts newest first, carrying the message timestamp', () {
      final files = collectOverviewFiles([
        message(
          id: 1,
          files: [
            {'uuid': 'old'},
          ],
          createdAt: DateTime(2026, 1, 1),
        ),
        message(
          id: 2,
          files: [
            {'uuid': 'new'},
          ],
          createdAt: DateTime(2026, 6, 1),
        ),
      ]);

      expect(files.map((e) => e.file['uuid']), ['new', 'old']);
      expect(files.first.createdAt, DateTime(2026, 6, 1));
    });

    test('returns nothing for text-only messages', () {
      expect(collectOverviewFiles([message(content: 'hi')]), isEmpty);
      expect(collectOverviewFiles([]), isEmpty);
    });
  });

  group('categoryOfFile', () {
    test('uses the mime type', () {
      expect(
        categoryOfFile({'mimeType': 'image/png', 'name': 'a.png'}),
        FileTypeCategory.image,
      );
      expect(categoryOfFile({'name': 'a.mp4'}), FileTypeCategory.video);
    });

    test('falls back to the name when there is no mime', () {
      expect(categoryOfFile({'name': 'a.pdf'}), FileTypeCategory.document);
    });

    test('detects a voice note from its name', () {
      expect(
        categoryOfFile({'name': 'novyse_vocal_1.wav'}),
        FileTypeCategory.voice,
      );
    });
  });

  group('isGifFile', () {
    test('accepts a .gif name', () {
      expect(isGifFile({'name': 'a.gif'}), isTrue);
      expect(isGifFile({'name': 'A.GIF'}), isTrue);
      expect(isGifFile({'fileName': 'b.gif'}), isTrue);
    });

    test('accepts an image/gif mime without a name', () {
      expect(isGifFile({'mimeType': 'image/gif'}), isTrue);
    });

    test('rejects other images', () {
      expect(isGifFile({'mimeType': 'image/png', 'name': 'a.png'}), isFalse);
    });

    test('rejects a name that merely contains gif', () {
      expect(isGifFile({'name': 'my.gif.png'}), isFalse);
    });

    test('rejects a file with nothing to go on', () {
      expect(isGifFile(<String, dynamic>{}), isFalse);
    });
  });

  group('collectOverviewLinks', () {
    test('finds a link and records the message it came from', () {
      final m = message(content: 'see https://novyse.app/docs');
      final links = collectOverviewLinks([m]);

      expect(links.single.url, 'https://novyse.app/docs');
      expect(links.single.message, same(m));
    });

    test('finds several links in one message', () {
      final links = collectOverviewLinks([
        message(content: 'a http://a.test and b https://b.test'),
      ]);

      expect(links.map((l) => l.url), ['http://a.test', 'https://b.test']);
    });

    test('deduplicates the same url across messages', () {
      final links = collectOverviewLinks([
        message(id: 1, content: 'https://a.test'),
        message(id: 2, content: 'https://a.test again'),
      ]);

      expect(links, hasLength(1));
      expect(links.single.message.id, 1);
    });

    test('strips trailing sentence punctuation', () {
      final links = collectOverviewLinks([
        message(content: 'go to https://a.test/page.'),
      ]);

      expect(links.single.url, 'https://a.test/page');
    });

    test('strips trailing brackets and commas', () {
      final links = collectOverviewLinks([
        message(content: '(https://a.test), see (https://b.test)!)'),
      ]);

      expect(links.map((l) => l.url), ['https://a.test', 'https://b.test']);
    });

    test('skips empty and null content', () {
      expect(collectOverviewLinks([message(), message(content: '')]), isEmpty);
    });

    test('returns nothing for text with no urls', () {
      expect(collectOverviewLinks([message(content: 'plain text')]), isEmpty);
    });
  });

  group('collectOverviewGifLinks', () {
    test('finds a gif url in the message content', () {
      final links = collectOverviewGifLinks([
        message(content: 'https://cdn.test/a.gif'),
      ]);

      expect(links.single.url, 'https://cdn.test/a.gif');
    });

    test('finds several gifs', () {
      final links = collectOverviewGifLinks([
        message(content: 'https://cdn.test/a.gif'),
        message(id: 2, content: 'https://cdn.test/b.gif'),
      ]);

      expect(links.map((l) => l.url), [
        'https://cdn.test/a.gif',
        'https://cdn.test/b.gif',
      ]);
    });

    test('deduplicates repeated gif urls', () {
      final links = collectOverviewGifLinks([
        message(id: 1, content: 'https://cdn.test/a.gif'),
        message(id: 2, content: 'https://cdn.test/a.gif'),
      ]);

      expect(links, hasLength(1));
      expect(links.single.message.id, 1);
    });

    test('ignores non-gif urls', () {
      expect(
        collectOverviewGifLinks([message(content: 'https://cdn.test/a.png')]),
        isEmpty,
      );
    });
  });

  group('formatBytesLabel', () {
    test('returns empty for a missing or zero size', () {
      expect(formatBytesLabel(null), '');
      expect(formatBytesLabel(0), '');
      expect(formatBytesLabel(-5), '');
    });

    test('formats bytes below a kilobyte', () {
      expect(formatBytesLabel(512), '512 B');
      expect(formatBytesLabel(1023), '1023 B');
    });

    test('formats kilobytes with one decimal', () {
      expect(formatBytesLabel(1024), '1.0 KB');
      expect(formatBytesLabel(1536), '1.5 KB');
    });

    test('formats megabytes with one decimal', () {
      expect(formatBytesLabel(1024 * 1024), '1.0 MB');
      expect(formatBytesLabel(2.5 * 1024 * 1024), '2.5 MB');
    });

    test('formats gigabytes with one decimal', () {
      expect(formatBytesLabel(1024 * 1024 * 1024), '1.0 GB');
      expect(formatBytesLabel(3.25 * 1024 * 1024 * 1024), '3.3 GB');
    });

    test('parses a numeric string size', () {
      expect(formatBytesLabel('2048'), '2.0 KB');
    });

    test('treats a non-numeric size as zero', () {
      expect(formatBytesLabel('unknown'), '');
    });
  });
}
