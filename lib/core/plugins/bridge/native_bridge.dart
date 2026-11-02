import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:novyse/core/plugins/bridge/bridge_protocol.dart';
import 'package:novyse/core/plugins/bridge/plugin_bridge.dart';
import 'package:novyse/core/plugins/plugin_build.dart';

/// The sandbox based on `flutter_inappwebview`.
///
/// One WebView per tile, no shared cookie store, no file access outside the
/// plugin directory, every permission request denied, downloads refused and
/// external navigation handed to the system browser. Only one JavaScript
/// handler is registered: everything the plugin asks for goes through it.
class NativePluginBridge extends PluginBridge {
  NativePluginBridge({
    required this.instanceId,
    required super.onRequest,
    this.openExternal,
  });

  final String instanceId;
  final ExternalUrlOpener? openExternal;

  InAppWebViewController? _controller;
  PluginBuild? _build;
  bool _disposed = false;

  @override
  Future<void> load(PluginBuild build) async {
    _build = build;
  }

  @override
  Widget build(BuildContext context) {
    final build = _build;
    if (_disposed || build == null || !build.isFile) {
      return const SizedBox.shrink();
    }

    return InAppWebView(
      initialFile: build.filePath,
      initialSettings: InAppWebViewSettings(
        javaScriptEnabled: true,
        allowFileAccessFromFileURLs: true,
        allowUniversalAccessFromFileURLs: false,
        allowFileAccess: true,
        allowContentAccess: false,
        mediaPlaybackRequiresUserGesture: false,
        disableContextMenu: true,
        supportZoom: false,
        transparentBackground: false,
        isInspectable: kDebugMode,
      ),
      onWebViewCreated: (controller) {
        _controller = controller;

        controller.addJavaScriptHandler(
          handlerName: BridgeProtocol.handlerName,
          callback: _onCall,
        );
      },
      shouldOverrideUrlLoading: _shouldOverride,
      onPermissionRequest: (controller, request) async => PermissionResponse(
        resources: const [],
        action: PermissionResponseAction.DENY,
      ),
      onDownloadStartRequest: (controller, request) async {},
      onJsAlert: (controller, dialog) async =>
          JsAlertResponse(handledByClient: true),
      onJsConfirm: (controller, dialog) async => JsConfirmResponse(
        handledByClient: true,
        action: JsConfirmResponseAction.CANCEL,
      ),
      onJsPrompt: (controller, dialog) async => JsPromptResponse(
        handledByClient: true,
        action: JsPromptResponseAction.CANCEL,
      ),
    );
  }

  @override
  Future<void> emit(String event, Object? payload) async {
    final controller = _controller;
    if (controller == null || _disposed) return;

    try {
      await controller.evaluateJavascript(source: emitScript(event, payload));
    } catch (error) {
      debugPrint('Plugin bridge emit failed: $error');
    }
  }

  @override
  Future<void> dispose() async {
    _disposed = true;
    _build = null;

    try {
      _controller?.dispose();
    } catch (_) {}

    _controller = null;
  }

  Future<List<dynamic>> _onCall(List<dynamic> arguments) async {
    final reply = await _replyFor(arguments.isEmpty ? null : arguments.first);

    return [reply.encode()];
  }

  Future<BridgeReply> _replyFor(Object? raw) async {
    final request = BridgeProtocol.decodeRequest(raw);
    if (request == null) {
      return const BridgeReply.failure(0, 'E_INTERNAL', 'Malformed request');
    }

    return onRequest(request);
  }

  /// Keeps the document on its own files and sends every link to the browser.
  Future<NavigationActionPolicy> _shouldOverride(
    InAppWebViewController controller,
    NavigationAction action,
  ) async {
    final uri = action.request.url;
    if (uri == null) return NavigationActionPolicy.ALLOW;

    final scheme = uri.scheme.toLowerCase();

    switch (scheme) {
      case 'file':
        final directory = _build?.filePath;
        if (directory == null) return NavigationActionPolicy.ALLOW;

        final root = directory.substring(0, directory.lastIndexOf('/') + 1);
        return uri.path.startsWith(root)
            ? NavigationActionPolicy.ALLOW
            : NavigationActionPolicy.CANCEL;
      case 'about':
      case 'data':
      case 'blob':
        return NavigationActionPolicy.ALLOW;
      case 'http':
      case 'https':
        await openExternal?.call(uri.toString());
        return NavigationActionPolicy.CANCEL;
      default:
        return NavigationActionPolicy.CANCEL;
    }
  }
}
