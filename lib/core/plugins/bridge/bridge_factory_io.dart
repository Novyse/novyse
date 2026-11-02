import 'package:flutter/foundation.dart';
import 'package:novyse/core/plugins/bridge/native_bridge.dart';
import 'package:novyse/core/plugins/bridge/plugin_bridge.dart';
import 'package:novyse/core/plugins/bridge/webview_all_bridge.dart';

/// Creates the sandbox of the current platform.
///
/// `flutter_inappwebview` gives the settings, the permission blocks and the
/// file navigation guards the plugins need, on Android, iOS, macOS, Windows
/// and the web. It has no Linux implementation, so Linux and the other GTK
/// targets fall back to the WebView the app already ships for Turnstile.
///
/// Every plugin bundle is a single self-contained document (see the plugins
/// repository), so the fallback engine loses nothing: there is no sub-resource
/// loading to police.
PluginBridge createPluginBridge({
  required String instanceId,
  required BridgeRequestHandler onRequest,
  ExternalUrlOpener? openExternal,
}) {
  final override = debugBridgeOverride;

  if (override != null) {
    return override(instanceId: instanceId, onRequest: onRequest);
  }

  if (defaultTargetPlatform == TargetPlatform.linux) {
    return WebViewAllPluginBridge(
      instanceId: instanceId,
      onRequest: onRequest,
      openExternal: openExternal,
    );
  }

  return NativePluginBridge(
    instanceId: instanceId,
    onRequest: onRequest,
    openExternal: openExternal,
  );
}

/// Replaces the bridge of the current platform, for tests and for a manual
/// check of a single engine. Set it back to `null` before shipping.
PluginBridge Function({
  required String instanceId,
  required BridgeRequestHandler onRequest,
})?
debugBridgeOverride;
