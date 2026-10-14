import 'dart:io' as io;

/// Converts a `file://` URI to a filesystem path.
///
/// Naive prefix stripping leaves `/C:/...` (plus `%20` escapes) behind,
/// which is not a valid path on Windows. [Uri.toFilePath] decodes both
/// correctly on every platform. Plain paths pass through untouched.
String filePathFromUri(String uri) {
  if (!uri.startsWith('file://')) return uri;
  try {
    return Uri.parse(uri).toFilePath();
  } catch (_) {
    return uri.replaceFirst('file://', '');
  }
}

/// Same as [filePathFromUri], wrapped in a [File].
io.File fileFromUri(String uri) => io.File(filePathFromUri(uri));
