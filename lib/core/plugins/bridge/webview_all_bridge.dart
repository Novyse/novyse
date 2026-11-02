import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:novyse/core/plugins/bridge/bridge_protocol.dart';
import 'package:novyse/core/plugins/bridge/plugin_bridge.dart';
import 'package:novyse/core/plugins/plugin_build.dart';
import 'package:webview_all/webview_all.dart';

/// The sandbox for the platforms `flutter_inappwebview` does not support,
/// Linux and the other GTK targets.
///
/// It reuses the WebView the app already ships (`webview_all`, the Turnstile
/// one), so no second WebView stack has to be built for Linux. The settings
/// are the same in spirit: script on, no navigation outside the document,
/// links handed to the system browser, no dialogs.
///
/// The transport is a JavaScript channel instead of a promise, so the host
/// answers through `window.__appSdkReply`.
class WebViewAllPluginBridge extends PluginBridge {
  WebViewAllPluginBridge({
    required this.instanceId,
    required super.onRequest,
    this.openExternal,
  });

  final String instanceId;
  final ExternalUrlOpener? openExternal;

  WebViewController? _controller;
  bool _disposed = false;

  @override
  Future<void> load(PluginBuild build) async {
    final controller = WebViewController();

    await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
    await controller.setBackgroundColor(const Color(0xFF000000));

    await controller.addJavaScriptChannel(
      BridgeProtocol.handlerName,
      onMessageReceived: _onMessage,
    );

    await controller.setNavigationDelegate(
      NavigationDelegate(onNavigationRequest: _onNavigationRequest),
    );

    _controller = controller;

    if (build.isFile) {
      await controller.loadFile(build.filePath!);
      return;
    }

    if (build.isDocument) {
      await controller.loadHtmlString(build.html!, baseUrl: 'about:blank');
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (_disposed || controller == null) return const SizedBox.shrink();

    return WebViewWidget(controller: controller);
  }

  @override
  Future<void> emit(String event, Object? payload) async {
    final controller = _controller;
    if (controller == null || _disposed) return;

    try {
      await controller.runJavaScript(emitScript(event, payload));
    } catch (error) {
      debugPrint('Plugin bridge emit failed: $error');
    }
  }

  @override
  Future<void> dispose() async {
    _disposed = true;
    _controller = null;
  }

  void _onMessage(JavaScriptMessage message) {
    unawaited(_answer(message.message));
  }

  Future<void> _answer(String raw) async {
    final request = BridgeProtocol.decodeRequest(raw);

    final reply = request == null
        ? const BridgeReply.failure(0, 'E_INTERNAL', 'Malformed request')
        : await onRequest(request);

    final controller = _controller;
    if (controller == null || _disposed) return;

    try {
      await controller.runJavaScript(replyScript(reply));
    } catch (error) {
      debugPrint('Plugin bridge reply failed: $error');
    }
  }

  NavigationDecision _onNavigationRequest(NavigationRequest request) {
    final url = request.url;

    if (url.startsWith('file://') ||
        url.startsWith('about:') ||
        url.startsWith('data:') ||
        url.startsWith('blob:')) {
      return NavigationDecision.navigate;
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      unawaited(openExternal?.call(url) ?? Future<void>.value());
      return NavigationDecision.prevent;
    }

    return NavigationDecision.prevent;
  }
}
