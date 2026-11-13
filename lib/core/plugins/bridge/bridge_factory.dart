import 'package:novyse/core/plugins/bridge/plugin_bridge.dart';
import 'package:novyse/core/plugins/bridge/webview_all_bridge.dart';

/// Creates the sandbox of the current platform.
PluginBridge createPluginBridge({
  required String instanceId,
  required BridgeRequestHandler onRequest,
}) {
  return WebViewAllPluginBridge(
    instanceId: instanceId,
    onRequest: onRequest,
  );
}
