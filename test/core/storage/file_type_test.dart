import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/storage/file/file_type.dart';

/// `file_type` is pure lookup logic: mime → category, name → mime, mime →
/// icon/tint. Every branch is cheap to pin.
void main() {
  group('getFileType', () {
    test('maps image mimes', () {
      expect(getFileType('image/png'), FileTypeCategory.image);
      expect(getFileType('image/jpeg'), FileTypeCategory.image);
      expect(getFileType('image/svg+xml'), FileTypeCategory.image);
    });

    test('maps video mimes', () {
      expect(getFileType('video/mp4'), FileTypeCategory.video);
      expect(getFileType('video/webm'), FileTypeCategory.video);
    });

    test('maps audio mimes', () {
      expect(getFileType('audio/mpeg'), FileTypeCategory.audio);
      expect(getFileType('audio/flac'), FileTypeCategory.audio);
    });

    test('maps document mimes', () {
      expect(getFileType('application/pdf'), FileTypeCategory.document);
      expect(getFileType('text/plain'), FileTypeCategory.document);
      expect(getFileType('application/rtf'), FileTypeCategory.document);
    });

    test('maps code mimes', () {
      expect(getFileType('application/json'), FileTypeCategory.code);
      expect(getFileType('text/markdown'), FileTypeCategory.code);
      expect(getFileType('text/html'), FileTypeCategory.code);
      expect(getFileType('text/rust'), FileTypeCategory.code);
    });

    test('maps archive mimes', () {
      expect(getFileType('application/zip'), FileTypeCategory.archive);
      expect(getFileType('application/gzip'), FileTypeCategory.archive);
      expect(
        getFileType('application/x-7z-compressed'),
        FileTypeCategory.archive,
      );
    });

    test('maps octet-stream to other', () {
      expect(getFileType('application/octet-stream'), FileTypeCategory.other);
    });

    test('falls back to other for an unknown mime', () {
      expect(getFileType('application/x-nope'), FileTypeCategory.other);
      expect(getFileType(''), FileTypeCategory.other);
    });

    test('ignores the mime parameters and casing', () {
      expect(getFileType('IMAGE/PNG; charset=binary'), FileTypeCategory.image);
      expect(getFileType('  video/mp4  '), FileTypeCategory.video);
    });

    test('treats a novyse_vocal_ name as a voice note whatever the mime', () {
      expect(
        getFileType('audio/mpeg', 'novyse_vocal_123.wav'),
        FileTypeCategory.voice,
      );
      expect(
        getFileType('application/octet-stream', 'NOVYSE_VOCAL_1.bin'),
        FileTypeCategory.voice,
      );
    });

    test('downgrades a voice mime without a novyse_vocal_ name to audio', () {
      expect(getFileType('audio/wav', 'recording.wav'), FileTypeCategory.audio);
      expect(getFileType('audio/aac', 'recording.aac'), FileTypeCategory.audio);
    });

    test('downgrades a voice mime with no name at all to audio', () {
      expect(getFileType('audio/wav'), FileTypeCategory.audio);
      expect(getFileType('audio/aac'), FileTypeCategory.audio);
    });
  });

  group('getMimeType', () {
    test('prefers a non-generic mime on a map', () {
      expect(
        getMimeType({'mimeType': 'image/png', 'name': 'a.txt'}),
        'image/png',
      );
    });

    test('accepts the type key as a fallback', () {
      expect(getMimeType({'type': 'video/mp4'}), 'video/mp4');
    });

    test('looks the name up when the map mime is generic', () {
      expect(
        getMimeType({'mimeType': 'application/octet-stream', 'name': 'a.png'}),
        'image/png',
      );
    });

    test('looks the name up when the map has no mime', () {
      expect(getMimeType({'name': 'a.pdf'}), 'application/pdf');
    });

    test('accepts the fileName key', () {
      expect(getMimeType({'fileName': 'a.mp4'}), 'video/mp4');
    });

    test('returns the generic mime for a map with nothing usable', () {
      expect(getMimeType(<String, dynamic>{}), defaultMimeType);
      expect(getMimeType({'mimeType': ''}), defaultMimeType);
    });

    test('resolves a plain string as a name or path', () {
      expect(getMimeType('a.png'), 'image/png');
      expect(getMimeType('/tmp/dir/a.pdf'), 'application/pdf');
    });

    test('sniffs the header bytes when a name is useless', () {
      expect(
        getMimeType(
          null,
          headerBytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
        ),
        'image/png',
      );
    });

    test('returns the generic mime for null with no header', () {
      expect(getMimeType(null), defaultMimeType);
      expect(getMimeType(null, headerBytes: const []), defaultMimeType);
    });

    test('returns the generic mime for an unsupported type', () {
      expect(getMimeType(42), defaultMimeType);
    });
  });

  group('getMimeTypeByName', () {
    test('resolves by extension', () {
      expect(getMimeTypeByName('a.png'), 'image/png');
    });

    test('falls back for an empty name', () {
      expect(getMimeTypeByName(''), defaultMimeType);
    });

    test('sniffs the header bytes', () {
      expect(
        getMimeTypeByName('mystery', headerBytes: [0x25, 0x50, 0x44, 0x46]),
        'application/pdf',
      );
    });
  });

  group('extensionFromMime', () {
    test('resolves a known extension', () {
      expect(extensionFromMime('image/png'), 'png');
      expect(extensionFromMime('application/pdf'), 'pdf');
    });

    test('ignores parameters and casing', () {
      expect(extensionFromMime('TEXT/PLAIN; charset=utf-8'), 'txt');
    });

    test('returns empty for an unknown mime', () {
      expect(extensionFromMime('application/x-nope'), '');
    });

    test('returns empty for an empty mime', () {
      expect(extensionFromMime(''), '');
      expect(extensionFromMime('   '), '');
    });
  });

  group('fileIconForMime', () {
    test('picks a pdf icon', () {
      expect(fileIconForMime('application/pdf'), HugeIcons.strokeRoundedPdf01);
      expect(
        fileIconForMime('application/pdf; charset=binary'),
        HugeIcons.strokeRoundedPdf01,
      );
    });

    test('picks a doc icon for word and generic documents', () {
      expect(
        fileIconForMime('application/msword'),
        HugeIcons.strokeRoundedDoc01,
      );
      expect(
        fileIconForMime(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
        HugeIcons.strokeRoundedDoc01,
      );
    });

    test('picks a spreadsheet icon', () {
      expect(
        fileIconForMime('application/vnd.ms-excel'),
        HugeIcons.strokeRoundedFileSpreadsheet,
      );
    });

    test('picks a presentation icon', () {
      expect(
        fileIconForMime('application/vnd.ms-powerpoint'),
        HugeIcons.strokeRoundedPpt01,
      );
    });

    test('the generic document check wins over spreadsheet/presentation', () {
      // Both OpenDocument and OpenXML mimes contain the substring "document",
      // which the document branch tests for before the sheet/ppt branches.
      for (final mime in [
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ]) {
        expect(
          fileIconForMime(mime),
          HugeIcons.strokeRoundedDoc01,
          reason: mime,
        );
      }
    });

    test('picks a text icon for any text mime', () {
      expect(fileIconForMime('text/plain'), HugeIcons.strokeRoundedTxt01);
      expect(fileIconForMime('text/markdown'), HugeIcons.strokeRoundedTxt01);
    });

    test('picks a zip icon for every archive flavour', () {
      expect(
        fileIconForMime('application/zip'),
        HugeIcons.strokeRoundedFileZip,
      );
      expect(
        fileIconForMime('application/x-rar-compressed'),
        HugeIcons.strokeRoundedFileZip,
      );
      expect(
        fileIconForMime('application/x-tar'),
        HugeIcons.strokeRoundedFileZip,
      );
      expect(
        fileIconForMime('application/x-7z-compressed'),
        HugeIcons.strokeRoundedFileZip,
      );
      expect(
        fileIconForMime('application/gzip'),
        HugeIcons.strokeRoundedFileZip,
      );
    });

    test('picks a code icon for the non-text source languages', () {
      for (final mime in [
        'application/javascript',
        'application/json',
        'application/xml',
        'application/typescript',
      ]) {
        expect(
          fileIconForMime(mime),
          HugeIcons.strokeRoundedFileCode,
          reason: mime,
        );
      }
    });

    test('the text/ check wins over the code check', () {
      // python, java, html, css and rust all start with `text/`, so the text
      // icon branch is reached before the code branch.
      for (final mime in [
        'text/x-python',
        'text/x-java-source',
        'text/html',
        'text/css',
        'text/rust',
      ]) {
        expect(
          fileIconForMime(mime),
          HugeIcons.strokeRoundedTxt01,
          reason: mime,
        );
      }
    });

    test('falls back to a generic file icon', () {
      expect(fileIconForMime('image/png'), HugeIcons.strokeRoundedFile01);
      expect(
        fileIconForMime('application/x-nope'),
        HugeIcons.strokeRoundedFile01,
      );
    });
  });

  group('fileIconColorForMime', () {
    const scheme = ColorScheme.light();

    test('tints pdf red', () {
      expect(fileIconColorForMime('application/pdf', scheme), Colors.red);
    });

    test('tints documents blue', () {
      expect(fileIconColorForMime('application/msword', scheme), Colors.blue);
      expect(
        fileIconColorForMime('application/vnd.oasis.opendocument.text', scheme),
        Colors.blue,
      );
    });

    test('tints spreadsheets green', () {
      expect(
        fileIconColorForMime('application/vnd.ms-excel', scheme),
        Colors.green,
      );
    });

    test('tints presentations orange', () {
      expect(
        fileIconColorForMime('application/vnd.ms-powerpoint', scheme),
        Colors.orange,
      );
    });

    test('tints archives brown', () {
      expect(fileIconColorForMime('application/zip', scheme), Colors.brown);
      expect(
        fileIconColorForMime('application/x-rar-compressed', scheme),
        Colors.brown,
      );
    });

    test('tints code with the theme tertiary colour', () {
      expect(
        fileIconColorForMime('application/javascript', scheme),
        scheme.tertiary,
      );
      expect(
        fileIconColorForMime('application/x-code', scheme),
        scheme.tertiary,
      );
    });

    test('falls back to onSurfaceVariant', () {
      expect(
        fileIconColorForMime('image/png', scheme),
        scheme.onSurfaceVariant,
      );
      expect(
        fileIconColorForMime('application/x-nope', scheme),
        scheme.onSurfaceVariant,
      );
    });
  });
}
