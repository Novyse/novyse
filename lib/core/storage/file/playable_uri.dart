import 'package:flutter/foundation.dart' show kIsWeb;

/// Shared helpers for media message widgets that resolve a playable URI
/// via [UriResolver].

/// Returns true when [uri] can be handed directly to a media player.
bool isPlayableMediaUri(String? uri) {
  if (uri == null || uri.isEmpty) return false;
  if (uri.startsWith('http://') ||
      uri.startsWith('https://') ||
      uri.startsWith('blob:') ||
      uri.startsWith('data:')) {
    return true;
  }
  if (!kIsWeb && (uri.startsWith('file://') || uri.startsWith('/'))) {
    return true;
  }
  return false;
}

/// Picks the URI to play: the [resolvedUri] from [UriResolver] when
/// available, otherwise [fileRef] when it is already playable, else `null`.
String? resolveMediaUri(String? resolvedUri, String? fileRef) {
  if (resolvedUri != null && resolvedUri.isNotEmpty) return resolvedUri;
  if (isPlayableMediaUri(fileRef)) return fileRef;
  return null;
}

/// Normalizes a URI or absolute path into a source a media player can open.
///
/// Remote, blob and data URIs pass through unchanged. On native platforms,
/// `file://` URIs are kept and absolute Unix/Windows paths are converted to
/// `file://` URIs. Returns `null` for unsupported values and for local paths
/// on web.
String? normalizeMediaUri(String? uri) {
  if (uri == null || uri.isEmpty) return null;
  if (uri.startsWith('http://') ||
      uri.startsWith('https://') ||
      uri.startsWith('blob:') ||
      uri.startsWith('data:')) {
    return uri;
  }
  if (kIsWeb) return null;
  if (uri.startsWith('file://')) return uri;
  if (uri.startsWith('/') || RegExp(r'^[a-zA-Z]:[\\/]').hasMatch(uri)) {
    return 'file://$uri';
  }
  return null;
}
