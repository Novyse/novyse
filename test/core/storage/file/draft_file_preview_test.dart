import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/storage/file/draft_file_preview.dart';

void main() {
  group('draftFileId', () {
    test('builds a stable namespaced id from chat and index', () {
      expect(draftFileId('chat-1', 0), 'draft:chat-1:0');
      expect(draftFileId('chat-1', 2), 'draft:chat-1:2');
    });
  });

  group('draftMessageFile category mapping', () {
    test('image mime maps to image', () {
      final msg = draftMessageFile(
        {'name': 'photo.png', 'size': 10, 'mimeType': 'image/png'},
        chatUUID: 'chat-1',
        index: 0,
      );
      expect(msg.isImage, isTrue);
      expect(msg.isVideo, isFalse);
    });

    test('video mime maps to video', () {
      final msg = draftMessageFile(
        {'name': 'clip.mp4', 'size': 10, 'mimeType': 'video/mp4'},
        chatUUID: 'chat-1',
        index: 0,
      );
      expect(msg.isVideo, isTrue);
      expect(msg.isImage, isFalse);
    });

    test('audio mime maps to audio', () {
      final msg = draftMessageFile(
        {'name': 'song.mp3', 'size': 10, 'mimeType': 'audio/mpeg'},
        chatUUID: 'chat-1',
        index: 0,
      );
      expect(msg.isAudio, isTrue);
      expect(msg.isVoice, isFalse);
    });

    test('explicit VOICE type maps to voice', () {
      final msg = draftMessageFile(
        {
          'name': 'novyse_vocal_123.m4a',
          'size': 10,
          'mimeType': 'audio/aac',
          'type': 'VOICE',
        },
        chatUUID: 'chat-1',
        index: 0,
      );
      expect(msg.isVoice, isTrue);
      expect(msg.isAudio, isFalse);
    });

    test('novyse_vocal_ prefix without explicit type maps to voice', () {
      final msg = draftMessageFile(
        {'name': 'novyse_vocal_123.webm', 'size': 10, 'mimeType': 'audio/webm'},
        chatUUID: 'chat-1',
        index: 0,
      );
      expect(msg.isVoice, isTrue);
    });

    test('pdf maps to document (generic open path)', () {
      final msg = draftMessageFile(
        {'name': 'doc.pdf', 'size': 10, 'mimeType': 'application/pdf'},
        chatUUID: 'chat-1',
        index: 0,
      );
      expect(msg.isDocument, isTrue);
      expect(msg.isImage, isFalse);
      expect(msg.isVideo, isFalse);
      expect(msg.isAudio, isFalse);
      expect(msg.isVoice, isFalse);
    });

    test('generic mime infers category from file name', () {
      final msg = draftMessageFile(
        {
          'name': 'photo.png',
          'size': 10,
          'mimeType': 'application/octet-stream',
        },
        chatUUID: 'chat-1',
        index: 0,
      );
      expect(msg.isImage, isTrue);
    });

    test('unknown mime maps to other', () {
      final msg = draftMessageFile(
        {
          'name': 'blob.unknownext',
          'size': 10,
          'mimeType': 'application/x-foo',
        },
        chatUUID: 'chat-1',
        index: 0,
      );
      expect(msg.isOther, isTrue);
    });

    test('assigns a fallback uuid when missing', () {
      final msg = draftMessageFile(
        {'name': 'a.txt', 'size': 1, 'mimeType': 'text/plain'},
        chatUUID: 'chat-9',
        index: 3,
      );
      expect(msg.uuid, 'draft:chat-9:3');
    });
  });

  group('resolveDraftFileUri', () {
    test('passes remote URLs through', () async {
      final uri = await resolveDraftFileUri({
        'name': 'a.pdf',
        'uri': 'https://example.com/a.pdf',
        'mimeType': 'application/pdf',
      }, chatUUID: 'chat-1');
      expect(uri, 'https://example.com/a.pdf');
    });

    test('passes native absolute paths through', () async {
      final uri = await resolveDraftFileUri({
        'name': 'pic.png',
        'uri': '/tmp/pic.png',
        'mimeType': 'image/png',
      }, chatUUID: 'chat-1');
      expect(uri, '/tmp/pic.png');
    });

    test('returns null when nothing resolvable is present', () async {
      final uri = await resolveDraftFileUri({
        'name': 'doc.pdf',
        'size': 10,
        'mimeType': 'application/pdf',
      }, chatUUID: 'chat-1');
      expect(uri, isNull);
    });
  });

  group('toggleDraftAudioPlayback', () {
    test('returns false when the file cannot be resolved', () async {
      final ok = await toggleDraftAudioPlayback(
        chatUUID: 'chat-1',
        index: 0,
        file: {'name': 'song.mp3', 'size': 10, 'mimeType': 'audio/mpeg'},
      );
      expect(ok, isFalse);
    });
  });
}
