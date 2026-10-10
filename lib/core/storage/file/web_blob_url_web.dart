// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use
import 'dart:html' as html;

/// Creates a blob URL from raw bytes on web platforms.
/// This allows media players (audio, video, image) to load local files.
String? createWebBlobUrl(List<int> bytes, [String? mimeType]) {
  if (bytes.isEmpty) return null;
  final blob = mimeType != null
      ? html.Blob([bytes], mimeType)
      : html.Blob([bytes]);
  return html.Url.createObjectUrl(blob);
}

/// Revokes a previously created blob URL to free memory.
void revokeWebBlobUrl(String? url) {
  if (url != null && url.startsWith('blob:')) {
    html.Url.revokeObjectUrl(url);
  }
}

/// Opens or downloads a file in the browser on Web platforms.
void openOrDownloadFileWeb(String uri, String name) {
  if (uri.isEmpty) return;
  final anchor = html.AnchorElement(href: uri)
    ..target = '_blank'
    ..download = name;
  html.document.body?.children.add(anchor);
  anchor.click();
  anchor.remove();
}
