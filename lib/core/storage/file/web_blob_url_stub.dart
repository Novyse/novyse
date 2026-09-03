/// Stub for non-web platforms. Returns null since blob URLs are web-only.
String? createWebBlobUrl(List<int> bytes, [String? mimeType]) => null;

/// Revokes a previously created blob URL. No-op on non-web platforms.
void revokeWebBlobUrl(String? url) {}

/// Opens or downloads a file in the browser on Web. No-op on non-web platforms.
void openOrDownloadFileWeb(String uri, String name) {}
