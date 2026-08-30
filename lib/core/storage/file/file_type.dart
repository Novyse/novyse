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

/// Maps file extensions (without leading dot) to standard MIME types.
const Map<String, String> extToMime = {
  // Images
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'bmp': 'image/bmp',
  'svg': 'image/svg+xml',
  'tiff': 'image/tiff',
  'tif': 'image/tiff',
  'ico': 'image/x-icon',
  'heic': 'image/heic',
  'heif': 'image/heif',
  'psd': 'image/vnd.adobe.photoshop',
  'ai': 'application/postscript',
  'eps': 'application/postscript',
  // Videos
  'mp4': 'video/mp4',
  'm4v': 'video/mp4',
  'mov': 'video/quicktime',
  'avi': 'video/x-msvideo',
  'mkv': 'video/x-matroska',
  'webm': 'video/webm',
  'flv': 'video/x-flv',
  'wmv': 'video/x-ms-wmv',
  'mpeg': 'video/mpeg',
  'mpg': 'video/mpeg',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2',
  'ogv': 'video/ogg',
  'm2ts': 'video/mp2t',
  // Audio
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'm4a': 'audio/x-m4a',
  'flac': 'audio/flac',
  'ogg': 'audio/ogg',
  'oga': 'audio/ogg',
  'aac': 'audio/aac',
  'opus': 'audio/opus',
  'wma': 'audio/x-ms-wma',
  'amr': 'audio/amr',
  'mid': 'audio/midi',
  'midi': 'audio/midi',
  'aif': 'audio/x-aiff',
  'aiff': 'audio/x-aiff',
  // Documents / Spreadsheets / Presentations
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'odt': 'application/vnd.oasis.opendocument.text',
  'ods': 'application/vnd.oasis.opendocument.spreadsheet',
  'odp': 'application/vnd.oasis.opendocument.presentation',
  'rtf': 'application/rtf',
  'txt': 'text/plain',
  'csv': 'text/csv',
  'pages': 'application/x-iwork-pages-sffpages',
  'numbers': 'application/x-iwork-numbers-sffnumbers',
  'key': 'application/x-iwork-keynote-sffkey',
  'epub': 'application/epub+zip',
  // Code / Text / Config
  'js': 'application/javascript',
  'jsx': 'text/javascript',
  'ts': 'application/typescript',
  'tsx': 'application/typescript',
  'dart': 'application/vnd.dart',
  'py': 'text/x-python',
  'java': 'text/x-java-source',
  'c': 'text/x-c',
  'cpp': 'text/x-c++',
  'h': 'text/x-c',
  'hpp': 'text/x-c++',
  'cs': 'text/plain',
  'go': 'text/x-go',
  'rs': 'text/rust',
  'rb': 'text/x-ruby',
  'php': 'application/x-php',
  'sh': 'application/x-shellscript',
  'bat': 'application/x-shellscript',
  'ps1': 'application/x-shellscript',
  'sql': 'application/sql',
  'html': 'text/html',
  'css': 'text/css',
  'scss': 'text/css',
  'sass': 'text/css',
  'less': 'text/css',
  'json': 'application/json',
  'xml': 'application/xml',
  'yaml': 'application/x-yaml',
  'yml': 'application/x-yaml',
  'md': 'text/markdown',
  'r': 'text/plain',
  'swift': 'text/plain',
  'kt': 'text/plain',
  'kts': 'text/plain',
  'scala': 'text/plain',
  'perl': 'text/x-script.perl',
  'pl': 'text/x-script.perl',
  'lua': 'text/x-script.phyton',
  'properties': 'text/plain',
  'ini': 'text/plain',
  'conf': 'text/plain',
  'cfg': 'text/plain',
  'log': 'text/plain',
  'patch': 'text/plain',
  'diff': 'text/plain',
  // Archives
  'zip': 'application/zip',
  'rar': 'application/x-rar-compressed',
  'tar': 'application/x-tar',
  'gz': 'application/gzip',
  'gzip': 'application/gzip',
  '7z': 'application/x-7z-compressed',
  'bz2': 'application/x-bzip2',
  'xz': 'application/x-xz',
  'dmg': 'application/x-apple-diskimage',
  'iso': 'application/x-iso9660-image',
  'apk': 'application/vnd.android.package-archive',
  'jar': 'application/java-archive',
  // Fonts
  'ttf': 'font/ttf',
  'otf': 'font/otf',
  'woff': 'font/woff',
  'woff2': 'font/woff2',
  // Database
  'db': 'application/octet-stream',
  'sqlite': 'application/octet-stream',
  'sqlite3': 'application/octet-stream',
};

/// Returns the file type category for a given MIME type and optional file name.
FileTypeCategory getFileType(String mimeType, [String? fileName]) {
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
String getMimeType(dynamic file) {
  if (file == null) return defaultMimeType;

  if (file is Map) {
    final mime = file['mimeType'] ?? file['type'];
    if (mime is String && mime.isNotEmpty) return mime;
    final name = (file['name'] ?? file['fileName'] ?? '') as String;
    return getMimeTypeByName(name);
  }

  if (file is String) {
    return getMimeTypeByName(file);
  }

  return defaultMimeType;
}

/// Resolves MIME type strictly by file name or extension.
String getMimeTypeByName(String fileName) {
  if (fileName.isEmpty) return defaultMimeType;
  final ext = fileName.split('.').last.toLowerCase();
  return extToMime[ext] ?? defaultMimeType;
}
