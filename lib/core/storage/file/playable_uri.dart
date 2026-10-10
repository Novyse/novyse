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
