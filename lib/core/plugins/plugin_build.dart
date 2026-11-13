import 'package:flutter/foundation.dart';
import 'package:novyse/core/plugins/bridge/app_sdk_js.dart';
import 'package:novyse/core/plugins/models/frame_origins.dart';

/// A build of a plugin, ready to be mounted.
///
/// Native platforms mount it from disk ([filePath]); the web cannot read a
/// local file into an iframe, so it carries the self-contained document
/// ([html]), which the bridge mounts with `srcdoc`: a frame without a `src`
/// keeps the url of the app, and that url is the `Referer` its players get.
@immutable
class PluginBuild {
  const PluginBuild({
    required this.slug,
    required this.version,
    this.filePath,
    this.html,
    this.frameOrigins = FrameOrigins.none,
  });

  final String slug;
  final String version;
  final String? filePath;
  final String? html;

  /// What the manifest of this build allows in a frame.
  final FrameOrigins frameOrigins;

  /// True when the build is on disk.
  bool get isFile => filePath != null && filePath!.isNotEmpty;

  /// True when the build is an in-memory document.
  bool get isDocument => html != null && html!.isNotEmpty;
}

/// Injects the CSP and the SDK into a plugin document.
///
/// The SDK goes in before the plugin's own scripts, so `window.AppSDK` exists
/// by the time they run: injecting after `load` would race with them. Called
/// once, when the build is written to the cache (native) or fetched (web).
String prepareDocument(
  String html, {
  FrameOrigins frameOrigins = FrameOrigins.none,
}) {
  if (html.contains('__appSdkEmit')) return html;

  final head = RegExp(r'<head[^>]*>', caseSensitive: false).firstMatch(html);
  final frameSources = frameOrigins.csp;
  final policy = pluginContentSecurityPolicy(frameSources, allowEval: kIsWeb);
  final injection =
      '<meta http-equiv="Content-Security-Policy" content="$policy">'
      '<script>$appSdkSource</script>';

  if (head == null) return '$injection$html';

  return html.replaceRange(head.end, head.end, injection);
}
