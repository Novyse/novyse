import 'dart:js_interop';
import 'dart:typed_data';

import 'package:web/web.dart' as web;

/// Creates a blob URL from raw bytes on web platforms.
/// This allows media players (audio, video, image) to load local files.
String? createWebBlobUrl(List<int> bytes, [String? mimeType]) {
  if (bytes.isEmpty) return null;
  final data = Uint8List.fromList(bytes).toJS;
  final blob = mimeType != null
      ? web.Blob([data].toJS, web.BlobPropertyBag(type: mimeType))
      : web.Blob([data].toJS);
  return web.URL.createObjectURL(blob);
}

/// Revokes a previously created blob URL to free memory.
void revokeWebBlobUrl(String? url) {
  if (url != null && url.startsWith('blob:')) {
    web.URL.revokeObjectURL(url);
  }
}

/// Opens or downloads a file in the browser on Web platforms.
void openOrDownloadFileWeb(String uri, String name) {
  if (uri.isEmpty) return;
  final anchor = web.HTMLAnchorElement()
    ..href = uri
    ..target = '_blank'
    ..download = name;
  web.document.body?.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
