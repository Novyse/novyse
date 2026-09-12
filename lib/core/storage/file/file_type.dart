import 'package:flutter/material.dart' show Color, ColorScheme, Colors;
import 'package:hugeicons/hugeicons.dart';
import 'package:mime/mime.dart' as mime;

/// High-level categories for file types.
enum FileTypeCategory {
  image('IMAGE'),
  video('VIDEO'),
  audio('AUDIO'),
  voice('VOICE'),
  document('DOCUMENT'),
  code('CODE'),
  archive('ARCHIVE'),
  other('OTHER');

  final String value;
  const FileTypeCategory(this.value);

  static FileTypeCategory fromString(String val) {
    return FileTypeCategory.values.firstWhere(
      (e) => e.value.toUpperCase() == val.toUpperCase(),
      orElse: () => FileTypeCategory.other,
    );
  }
}

const String defaultMimeType = 'application/octet-stream';

/// Maps MIME types to file type categories.
const Map<String, FileTypeCategory> mimeToType = {
  // IMAGE
  'image/jpeg': FileTypeCategory.image,
  'image/jpg': FileTypeCategory.image,
  'image/png': FileTypeCategory.image,
  'image/gif': FileTypeCategory.image,
  'image/bmp': FileTypeCategory.image,
  'image/tiff': FileTypeCategory.image,
  'image/webp': FileTypeCategory.image,
  'image/svg+xml': FileTypeCategory.image,
  // VIDEO
  'video/mp4': FileTypeCategory.video,
  'video/avi': FileTypeCategory.video,
  'video/x-matroska': FileTypeCategory.video,
  'video/quicktime': FileTypeCategory.video,
  'video/x-ms-wmv': FileTypeCategory.video,
  'video/x-flv': FileTypeCategory.video,
  'video/webm': FileTypeCategory.video,
  'video/mpeg': FileTypeCategory.video,
  // AUDIO
  'audio/mpeg': FileTypeCategory.audio,
  'audio/flac': FileTypeCategory.audio,
  'audio/x-ms-wma': FileTypeCategory.audio,
  'audio/m4a': FileTypeCategory.audio,
  'audio/x-m4a': FileTypeCategory.audio,
  'audio/opus': FileTypeCategory.audio,
  'audio/mp4': FileTypeCategory.audio,
  'audio/webm': FileTypeCategory.audio,
  'audio/ogg': FileTypeCategory.audio,
  // VOICE
  'audio/wav': FileTypeCategory.voice,
  'audio/aac': FileTypeCategory.voice,
  // DOCUMENT
  'application/pdf': FileTypeCategory.document,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      FileTypeCategory.document,
  'application/msword': FileTypeCategory.document,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      FileTypeCategory.document,
  'application/vnd.ms-excel': FileTypeCategory.document,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      FileTypeCategory.document,
  'application/vnd.ms-powerpoint': FileTypeCategory.document,
  'text/plain': FileTypeCategory.document,
  'application/rtf': FileTypeCategory.document,
  'application/vnd.oasis.opendocument.text': FileTypeCategory.document,
  'application/vnd.oasis.opendocument.spreadsheet': FileTypeCategory.document,
  'application/vnd.oasis.opendocument.presentation': FileTypeCategory.document,
  // CODE
  'application/javascript': FileTypeCategory.code,
  'text/javascript': FileTypeCategory.code,
  'text/x-python': FileTypeCategory.code,
  'text/x-java-source': FileTypeCategory.code,
  'text/x-c': FileTypeCategory.code,
  'text/x-c++': FileTypeCategory.code,
  'text/html': FileTypeCategory.code,
  'text/css': FileTypeCategory.code,
  'application/x-php': FileTypeCategory.code,
  'text/x-ruby': FileTypeCategory.code,
  'text/x-go': FileTypeCategory.code,
  'text/rust': FileTypeCategory.code,
  'application/typescript': FileTypeCategory.code,
  'application/x-shellscript': FileTypeCategory.code,
  'application/sql': FileTypeCategory.code,
  'application/xml': FileTypeCategory.code,
  'application/json': FileTypeCategory.code,
  'application/x-yaml': FileTypeCategory.code,
  'text/markdown': FileTypeCategory.code,
  // ARCHIVE
  'application/zip': FileTypeCategory.archive,
  'application/x-rar-compressed': FileTypeCategory.archive,
  'application/x-tar': FileTypeCategory.archive,
  'application/gzip': FileTypeCategory.archive,
  'application/x-7z-compressed': FileTypeCategory.archive,
  'application/x-bzip2': FileTypeCategory.archive,
  'application/x-xz': FileTypeCategory.archive,
  // OTHER
  'application/octet-stream': FileTypeCategory.other,
};

bool _isGenericMime(String? mimeType) {
  if (mimeType == null) return true;
  final clean = mimeType.split(';').first.trim().toLowerCase();
  return clean.isEmpty || clean == defaultMimeType;
}

/// Returns the file type category for a given MIME type and optional file name.
FileTypeCategory getFileType(String mimeType, [String? fileName]) {
  if (fileName != null && fileName.toLowerCase().startsWith('novyse_vocal_')) {
    return FileTypeCategory.voice;
  }

  final clean = mimeType.split(';').first.trim().toLowerCase();
  final type = mimeToType[clean] ?? FileTypeCategory.other;

  if (type == FileTypeCategory.voice) {
    if (fileName == null) return FileTypeCategory.audio;
    final lowerName = fileName.toLowerCase();
    if (lowerName.startsWith('novyse_vocal_')) {
      return FileTypeCategory.voice;
    } else {
      return FileTypeCategory.audio;
    }
  }

  return type;
}

/// Resolves the MIME type from a file name, path or map object.
///
/// Resolve order:
/// 1. Existing mime on a map, when present and not empty/octet-stream
/// 2. [lookupMimeType]-style lookup via path/name + optional [headerBytes]
/// 3. [defaultMimeType]
String getMimeType(dynamic file, {List<int>? headerBytes}) {
  if (file == null) {
    if (headerBytes != null && headerBytes.isNotEmpty) {
      return getMimeTypeByName('', headerBytes: headerBytes);
    }
    return defaultMimeType;
  }

  if (file is Map) {
    final mimeValue = file['mimeType'] ?? file['type'];
    if (mimeValue is String && !_isGenericMime(mimeValue)) {
      return mimeValue;
    }
    final name = (file['name'] ?? file['fileName'] ?? '') as String;
    return getMimeTypeByName(name, headerBytes: headerBytes);
  }

  if (file is String) {
    return getMimeTypeByName(file, headerBytes: headerBytes);
  }

  return defaultMimeType;
}

/// Resolves MIME type by file name/extension, optionally sniffing [headerBytes]
/// when provided (magic-byte match runs inside [mime.lookupMimeType]).
String getMimeTypeByName(String fileName, {List<int>? headerBytes}) {
  final path = fileName.isEmpty ? 'file' : fileName;
  return mime.lookupMimeType(path, headerBytes: headerBytes) ??
      defaultMimeType;
}

/// Returns the preferred file extension (without leading dot) for a MIME type.
/// Returns an empty string when [mimeType] maps to no known extension.
String extensionFromMime(String mimeType) {
  final clean = mimeType.split(';').first.trim().toLowerCase();
  if (clean.isEmpty) return '';
  return mime.extensionFromMime(clean) ?? '';
}

/// Hugeicons (stroke-rounded) icon data for a MIME type.
/// Centralizes the attachment-icon selection previously in
/// `MessageFileAttachment`, preserving its per-subtype distinctions.
List<List<dynamic>> fileIconForMime(String mimeType) {
  final mimeValue = mimeType.split(';').first.trim().toLowerCase();
  if (mimeValue.startsWith('application/pdf')) {
    return HugeIcons.strokeRoundedPdf01;
  }
  if (mimeValue.contains('word') || mimeValue.contains('document')) {
    return HugeIcons.strokeRoundedDoc01;
  }
  if (mimeValue.contains('sheet') || mimeValue.contains('excel')) {
    return HugeIcons.strokeRoundedFileSpreadsheet;
  }
  if (mimeValue.contains('presentation') || mimeValue.contains('powerpoint')) {
    return HugeIcons.strokeRoundedPpt01;
  }
  if (mimeValue.startsWith('text/')) return HugeIcons.strokeRoundedTxt01;
  if (mimeValue.contains('zip') ||
      mimeValue.contains('rar') ||
      mimeValue.contains('tar') ||
      mimeValue.contains('7z') ||
      mimeValue.contains('gzip')) {
    return HugeIcons.strokeRoundedFileZip;
  }
  if (mimeValue.contains('javascript') ||
      mimeValue.contains('python') ||
      mimeValue.contains('java') ||
      mimeValue.contains('html') ||
      mimeValue.contains('css') ||
      mimeValue.contains('json') ||
      mimeValue.contains('xml') ||
      mimeValue.contains('typescript')) {
    return HugeIcons.strokeRoundedFileCode;
  }
  return HugeIcons.strokeRoundedFile01;
}

/// Icon tint for a MIME type, mirroring the previous per-subtype colors.
/// [colorScheme] supplies the theme-aware fallbacks (code → tertiary,
/// default → onSurfaceVariant).
Color fileIconColorForMime(String mimeType, ColorScheme colorScheme) {
  final mimeValue = mimeType.split(';').first.trim().toLowerCase();
  if (mimeValue.startsWith('application/pdf')) return Colors.red;
  if (mimeValue.contains('word') || mimeValue.contains('document')) {
    return Colors.blue;
  }
  if (mimeValue.contains('sheet') || mimeValue.contains('excel')) {
    return Colors.green;
  }
  if (mimeValue.contains('presentation') || mimeValue.contains('powerpoint')) {
    return Colors.orange;
  }
  if (mimeValue.contains('zip') ||
      mimeValue.contains('rar') ||
      mimeValue.contains('tar')) {
    return Colors.brown;
  }
  if (mimeValue.contains('javascript') ||
      mimeValue.contains('python') ||
      mimeValue.contains('code') ||
      mimeValue.contains('html')) {
    return colorScheme.tertiary;
  }
  return colorScheme.onSurfaceVariant;
}
