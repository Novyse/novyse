/**
 * Maps MIME types to file type categories.
 */
const mimeToType = {
    // IMAGE
    'image/jpeg': 'IMAGE',
    'image/jpg': 'IMAGE',
    'image/png': 'IMAGE',
    'image/gif': 'IMAGE',
    'image/bmp': 'IMAGE',
    'image/tiff': 'IMAGE',
    'image/webp': 'IMAGE',
    'image/svg+xml': 'IMAGE',
    // VIDEO
    'video/mp4': 'VIDEO',
    'video/avi': 'VIDEO',
    'video/x-matroska': 'VIDEO',
    'video/quicktime': 'VIDEO',
    'video/x-ms-wmv': 'VIDEO',
    'video/x-flv': 'VIDEO',
    'video/webm': 'VIDEO',
    'video/mpeg': 'VIDEO',
    // AUDIO
    'audio/mpeg': 'AUDIO',
    'audio/wav': 'AUDIO',
    'audio/flac': 'AUDIO',
    'audio/aac': 'AUDIO',
    'audio/x-ms-wma': 'AUDIO',
    'audio/x-m4a': 'AUDIO',
    // VOICE
    'audio/ogg': 'VOICE',
    // DOCUMENT
    'application/pdf': 'DOCUMENT',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCUMENT',
    'application/msword': 'DOCUMENT',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'DOCUMENT',
    'application/vnd.ms-excel': 'DOCUMENT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'DOCUMENT',
    'application/vnd.ms-powerpoint': 'DOCUMENT',
    'text/plain': 'DOCUMENT',
    'application/rtf': 'DOCUMENT',
    'application/vnd.oasis.opendocument.text': 'DOCUMENT',
    'application/vnd.oasis.opendocument.spreadsheet': 'DOCUMENT',
    'application/vnd.oasis.opendocument.presentation': 'DOCUMENT',
    // CODE
    'application/javascript': 'CODE',
    'text/javascript': 'CODE',
    'text/x-python': 'CODE',
    'text/x-java-source': 'CODE',
    'text/x-c': 'CODE',
    'text/x-c++': 'CODE',
    'text/html': 'CODE',
    'text/css': 'CODE',
    'application/x-php': 'CODE',
    'text/x-ruby': 'CODE',
    'text/x-go': 'CODE',
    'text/rust': 'CODE',
    'application/typescript': 'CODE',
    'application/x-shellscript': 'CODE',
    'application/sql': 'CODE',
    'application/xml': 'CODE',
    'application/json': 'CODE',
    'application/x-yaml': 'CODE',
    'text/markdown': 'CODE',
    // ARCHIVE
    'application/zip': 'ARCHIVE',
    'application/x-rar-compressed': 'ARCHIVE',
    'application/x-tar': 'ARCHIVE',
    'application/gzip': 'ARCHIVE',
    'application/x-7z-compressed': 'ARCHIVE',
    'application/x-bzip2': 'ARCHIVE',
    'application/x-xz': 'ARCHIVE',
};

/**
 * Returns the file type category for a given MIME type.
 * @param {string} mimeType - The MIME type (e.g., 'image/jpeg').
 * @returns {string} The file type category (e.g., 'IMAGE'), or 'OTHER' if not found.
 */
function getFileType(mimeType) {
    return mimeToType[mimeType.toLowerCase()] || 'OTHER';
}

module.exports = { getFileType };