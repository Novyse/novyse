const defaultMimeType = "application/octet-stream";

/**
 * Maps MIME types to file type categories.
 */
const mimeToType = {
  // IMAGE
  "image/jpeg": "IMAGE",
  "image/jpg": "IMAGE",
  "image/png": "IMAGE",
  "image/gif": "IMAGE",
  "image/bmp": "IMAGE",
  "image/tiff": "IMAGE",
  "image/webp": "IMAGE",
  "image/svg+xml": "IMAGE",
  // VIDEO
  "video/mp4": "VIDEO",
  "video/avi": "VIDEO",
  "video/x-matroska": "VIDEO",
  "video/quicktime": "VIDEO",
  "video/x-ms-wmv": "VIDEO",
  "video/x-flv": "VIDEO",
  "video/webm": "VIDEO",
  "video/mpeg": "VIDEO",
  // AUDIO
  "audio/mpeg": "AUDIO",
  "audio/flac": "AUDIO",
  "audio/x-ms-wma": "AUDIO",
  "audio/x-m4a": "AUDIO",
  "audio/opus": "AUDIO",
  "audio/mp4": "AUDIO",
  "audio/webm": "AUDIO",
  "audio/ogg": "AUDIO",
  // VOICE
  "audio/wav": "VOICE",
  "audio/aac": "VOICE",
  // DOCUMENT
  "application/pdf": "DOCUMENT",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCUMENT",
  "application/msword": "DOCUMENT",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "DOCUMENT",
  "application/vnd.ms-excel": "DOCUMENT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "DOCUMENT",
  "application/vnd.ms-powerpoint": "DOCUMENT",
  "text/plain": "DOCUMENT",
  "application/rtf": "DOCUMENT",
  "application/vnd.oasis.opendocument.text": "DOCUMENT",
  "application/vnd.oasis.opendocument.spreadsheet": "DOCUMENT",
  "application/vnd.oasis.opendocument.presentation": "DOCUMENT",
  // CODE
  "application/javascript": "CODE",
  "text/javascript": "CODE",
  "text/x-python": "CODE",
  "text/x-java-source": "CODE",
  "text/x-c": "CODE",
  "text/x-c++": "CODE",
  "text/html": "CODE",
  "text/css": "CODE",
  "application/x-php": "CODE",
  "text/x-ruby": "CODE",
  "text/x-go": "CODE",
  "text/rust": "CODE",
  "application/typescript": "CODE",
  "application/x-shellscript": "CODE",
  "application/sql": "CODE",
  "application/xml": "CODE",
  "application/json": "CODE",
  "application/x-yaml": "CODE",
  "text/markdown": "CODE",
  // ARCHIVE
  "application/zip": "ARCHIVE",
  "application/x-rar-compressed": "ARCHIVE",
  "application/x-tar": "ARCHIVE",
  "application/gzip": "ARCHIVE",
  "application/x-7z-compressed": "ARCHIVE",
  "application/x-bzip2": "ARCHIVE",
  "application/x-xz": "ARCHIVE",
  // OTHER
  "application/octet-stream": "OTHER",
};

/**
 * Returns the file type category for a given MIME type.
 * @param {string} mimeType - The MIME type (e.g., 'image/jpeg').
 * @param {string|null} fileName - Optional file name.
 * @returns {string} The file type category (e.g., 'IMAGE') or 'OTHER' if not recognized.
 */
function getFileType(mimeType, fileName = null) {
  if (!mimeType) {
    throw new Error("MIME type is required to determine file type.");
  }

  const clean = mimeType.split(";")[0].trim().toLowerCase();

  const type = mimeToType[clean] || "OTHER";

  if (type === "VOICE") {
    if (!fileName) {
      return "AUDIO";
    }
    const lowerName = fileName.toLowerCase();
    if (lowerName.startsWith("novyse_vocal_")) {
      return "VOICE";
    } else {
      return "AUDIO";
    }
  }
  return type;
}

const extToMime = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  tiff: "image/tiff",
  tif: "image/tiff",
  ico: "image/x-icon",
  heic: "image/heic",
  heif: "image/heif",
  psd: "image/vnd.adobe.photoshop",
  ai: "application/postscript",
  eps: "application/postscript",
  // Videos
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  webm: "video/webm",
  flv: "video/x-flv",
  wmv: "video/x-ms-wmv",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  "3gp": "video/3gpp",
  "3g2": "video/3gpp2",
  ogv: "video/ogg",
  ts: "video/mp2t",
  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/x-m4a",
  flac: "audio/flac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  aac: "audio/aac",
  opus: "audio/opus",
  wma: "audio/x-ms-wma",
  amr: "audio/amr",
  mid: "audio/midi",
  midi: "audio/midi",
  aif: "audio/x-aiff",
  aiff: "audio/x-aiff",
  // Documents / Spreadsheets / Presentations
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  rtf: "application/rtf",
  txt: "text/plain",
  csv: "text/csv",
  pages: "application/x-iwork-pages-sffpages",
  numbers: "application/x-iwork-numbers-sffnumbers",
  key: "application/x-iwork-keynote-sffkey",
  epub: "application/epub+zip",
  // Code / Text / Config
  js: "application/javascript",
  jsx: "text/javascript",
  ts: "application/typescript",
  tsx: "application/typescript",
  py: "text/x-python",
  java: "text/x-java-source",
  c: "text/x-c",
  cpp: "text/x-c++",
  h: "text/x-c",
  hpp: "text/x-c++",
  cs: "text/plain",
  go: "text/x-go",
  rs: "text/rust",
  rb: "text/x-ruby",
  php: "application/x-php",
  sh: "application/x-shellscript",
  bat: "application/x-shellscript",
  ps1: "application/x-shellscript",
  sql: "application/sql",
  html: "text/html",
  css: "text/css",
  scss: "text/css",
  sass: "text/css",
  less: "text/css",
  json: "application/json",
  xml: "application/xml",
  yaml: "application/x-yaml",
  yml: "application/x-yaml",
  md: "text/markdown",
  r: "text/plain",
  swift: "text/plain",
  kt: "text/plain",
  kts: "text/plain",
  scala: "text/plain",
  perl: "text/x-script.perl",
  pl: "text/x-script.perl",
  lua: "text/x-script.phyton",
  properties: "text/plain",
  ini: "text/plain",
  conf: "text/plain",
  cfg: "text/plain",
  log: "text/plain",
  patch: "text/plain",
  diff: "text/plain",
  // Archives / Compression
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
  gzip: "application/gzip",
  "7z": "application/x-7z-compressed",
  bz2: "application/x-bzip2",
  xz: "application/x-xz",
  dmg: "application/x-apple-diskimage",
  iso: "application/x-iso9660-image",
  apk: "application/vnd.android.package-archive",
  jar: "application/java-archive",
  // Fonts
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
  // Database
  db: "application/octet-stream",
  sqlite: "application/octet-stream",
  sqlite3: "application/octet-stream",
  // Other / Binary
  exe: "application/x-msdownload",
  msi: "application/x-msdownload",
  bin: "application/octet-stream",
  dll: "application/octet-stream",
};

/**
 * Resolves the MIME type from the file object (checking name extension as fallback).
 * @param {object} file The file object (or uri/name).
 * @returns {string} The resolved MIME type.
 */
function getMimeType(file) {
  if (!file) return defaultMimeType;
  let mimeType = file.mimeType || file.type;
  if (mimeType) return mimeType;

  const name = file.name || file.fileName || "";
  const ext = name.split(".").pop()?.toLowerCase();
  return extToMime[ext] || defaultMimeType;
}

module.exports = { defaultMimeType, getFileType, getMimeType };
