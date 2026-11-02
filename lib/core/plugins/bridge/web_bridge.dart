import 'dart:async';
import 'dart:js_interop';
import 'dart:ui_web' as ui_web;

import 'package:flutter/widgets.dart';
import 'package:novyse/core/plugins/bridge/bridge_protocol.dart';
import 'package:novyse/core/plugins/bridge/plugin_bridge.dart';
import 'package:novyse/core/plugins/plugin_build.dart';
import 'package:web/web.dart' as web;

/// The sandbox of the web build: a sandboxed iframe (§9.7).
///
/// The document is a blob built from the fetched bundle, mounted with
/// `sandbox="allow-scripts"` and nothing else: no `allow-same-origin`, no
/// popups, no forms, no top navigation. The iframe therefore has an opaque
/// origin and cannot reach the storage or the DOM of the app, whatever the
/// plugin tries.
///
/// Events reach the plugin through `postMessage`, because a cross-origin
/// frame cannot run host code; the injected SDK dispatches them.
class WebPluginBridge extends PluginBridge {
  WebPluginBridge({required this.instanceId, required super.onRequest});

  final String instanceId;

  late final String _viewType = 'novyse-plugin-$instanceId';

  web.HTMLIFrameElement? _frame;
  String? _blobUrl;
  JSFunction? _listener;
  bool _disposed = false;

  @override
  Future<void> load(PluginBuild build) async {
    final document = build.html;
    if (document == null || document.isEmpty) {
      throw StateError('The web bridge needs an HTML document');
    }

    final blob = web.Blob(
      [document.toJS].toJS,
      web.BlobPropertyBag(type: 'text/html'),
    );
    final url = web.URL.createObjectURL(blob);
    _blobUrl = url;

    ui_web.platformViewRegistry.registerViewFactory(_viewType, (int viewId) {
      final frame =
          web.document.createElement('iframe') as web.HTMLIFrameElement;

      frame
        ..src = url
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..allow = '';
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.setAttribute('referrerpolicy', 'no-referrer');

      _frame = frame;
      _listen(frame);

      return frame;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_disposed) return const SizedBox.shrink();
    return HtmlElementView(viewType: _viewType);
  }

  @override
  Future<void> emit(String event, Object? payload) async {
    final frame = _frame;
    if (frame == null || _disposed) return;

    _post(frame, {
      'source': BridgeProtocol.webReplySource,
      'payload': {'event': event, 'payload': payload},
    });
  }

  @override
  Future<void> dispose() async {
    _disposed = true;

    final listener = _listener;
    if (listener != null) {
      web.window.removeEventListener('message', listener);
    }

    _listener = null;
    _frame = null;

    final url = _blobUrl;
    if (url != null) {
      web.URL.revokeObjectURL(url);
      _blobUrl = null;
    }
  }

  void _listen(web.HTMLIFrameElement frame) {
    final listener = ((web.MessageEvent event) {
      final frameWindow = frame.contentWindow;
      if (frameWindow == null || event.source != frameWindow) return;

      final data = event.data?.dartify();
      if (data is! Map) return;

      final envelope = Map<String, dynamic>.from(data);
      if (envelope['source'] != BridgeProtocol.webSource) return;

      unawaited(_answer(frameWindow, envelope['payload']));
    }).toJS;

    web.window.addEventListener('message', listener);
    _listener = listener;
  }

  Future<void> _answer(web.Window frameWindow, Object? payload) async {
    final request = BridgeProtocol.decodeRequest(payload);

    final reply = request == null
        ? const BridgeReply.failure(0, 'E_INTERNAL', 'Malformed request')
        : await onRequest(request);

    if (_disposed) return;

    _post(_frame, {
      'source': BridgeProtocol.webReplySource,
      'payload': reply.encode(),
    }, window: frameWindow);
  }

  void _post(
    web.HTMLIFrameElement? frame,
    Map<String, dynamic> message, {
    web.Window? window,
  }) {
    final target = window ?? frame?.contentWindow;
    if (target == null) return;

    try {
      target.postMessage(message.jsify(), '*'.toJS);
    } catch (_) {
      // The frame went away between the check and the post.
    }
  }
}
