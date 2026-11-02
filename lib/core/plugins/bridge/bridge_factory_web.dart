import 'package:novyse/core/plugins/bridge/plugin_bridge.dart';
import 'package:novyse/core/plugins/bridge/web_bridge.dart';

/// Creates the sandbox of the web build: a sandboxed iframe.
///
/// An iframe is strictly better than a WebView on the web: the `sandbox`
/// attribute without `allow-same-origin` gives the document an opaque origin,
/// so it cannot touch the storage or the DOM of the app whatever it does.
PluginBridge createPluginBridge({
  required String instanceId,
  required BridgeRequestHandler onRequest,
  ExternalUrlOpener? openExternal,
}) {
  // The sandbox has no top navigation and no popups, so there is nothing to
  // intercept: a link inside the plugin simply does not open. `openExternal`
  // is accepted for interface parity with the native factory.
  return WebPluginBridge(instanceId: instanceId, onRequest: onRequest);
}
