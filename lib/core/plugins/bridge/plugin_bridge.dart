import 'package:flutter/widgets.dart';
import 'package:novyse/core/plugins/bridge/bridge_protocol.dart';
import 'package:novyse/core/plugins/plugin_build.dart';

/// Handles one call of the plugin into the host.
typedef BridgeRequestHandler = Future<BridgeReply> Function(BridgeRequest);

/// A sandbox that runs one plugin document and answers its SDK calls.
///
/// The sandbox is the same everywhere: only the engine changes. The bridge
/// owns the transport, the host owns every decision: a request is handed to
/// [onRequest] and whatever comes back is sent to the plugin verbatim, so no
/// permission logic leaks into the platform code.
abstract class PluginBridge {
  PluginBridge({required this.onRequest});

  /// The host side of the protocol.
  final BridgeRequestHandler onRequest;

  /// Prepares the document. Must be called once before [build].
  Future<void> load(PluginBuild build);

  /// The widget of the sandbox, sized by its parent.
  Widget build(BuildContext context);

  /// Pushes an event to the plugin, best effort.
  Future<void> emit(String event, Object? payload);

  /// Tears the sandbox down: listeners, controllers, blob URLs.
  Future<void> dispose();
}

/// The JavaScript call that delivers an event, with [payload] embedded as a
/// JSON string literal so nothing in it can escape into code.
String emitScript(String event, Object? payload) {
  final envelope = BridgeProtocol.encodeEvent(event, payload);
  final literal = _jsString(envelope);
  return 'window.${BridgeProtocol.emitFunction}($literal);';
}

/// The JavaScript call that answers a request when the transport has no
/// promise to resolve (Linux channel, web `postMessage`).
String replyScript(BridgeReply reply) {
  final literal = _jsString(reply.encode());
  return 'window.${BridgeProtocol.replyFunction}($literal);';
}

/// Encodes [value] as a JavaScript string literal.
String _jsString(String value) {
  final escaped = value
      .replaceAll(r'\', r'\\')
      .replaceAll("'", r"\'")
      .replaceAll('\n', r'\n')
      .replaceAll('\r', r'\r')
      .replaceAll('\u2028', r'\u2028')
      .replaceAll('\u2029', r'\u2029');

  return "'$escaped'";
}

/// Runs [action] for an `http(s)` URL in the system browser.
typedef ExternalUrlOpener = Future<void> Function(String url);
