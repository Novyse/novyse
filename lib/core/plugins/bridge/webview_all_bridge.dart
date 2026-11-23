import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:novyse/core/plugins/bridge/bridge_protocol.dart';
import 'package:novyse/core/plugins/bridge/plugin_bridge.dart';
import 'package:novyse/core/plugins/bridge/plugin_document.dart';
import 'package:novyse/core/plugins/bridge/webview_controller_factory.dart';
import 'package:novyse/core/plugins/models/frame_origins.dart';
import 'package:novyse/core/plugins/plugin_build.dart';
import 'package:webview_all/webview_all.dart';

/// What the engine holds while a document is being loaded.
enum _DocumentState {
  /// No document, or the engine did not answer: a reload is the only way out.
  unknown,

  /// The document is loading: leave it alone.
  loading,

  /// The document is there: reloading it would only flash it black.
  arrived,
}

/// The sandbox of every platform
class WebViewAllPluginBridge extends PluginBridge {
  WebViewAllPluginBridge({required this.instanceId, required super.onRequest});

  final String instanceId;

  WebViewController? _controller;

  /// Serves the build of this bridge (native) or carries it in memory (web).
  late final PluginDocumentHost _document = PluginDocumentHost(
    instanceId: instanceId,
  );

  bool _disposed = false;

  /// True once the plugin has called the host at least once: before that the
  /// document does not exist and anything pushed at it would be lost.
  bool _pageReady = false;

  /// Events emitted while the document was still loading, in order.
  final List<({String event, Object? payload})> _pendingEvents = [];

  /// Ceiling of the queue: a document that never comes up must not grow it.
  static const int _maxPendingEvents = 32;

  /// The build waiting for its first laid-out frame.
  PluginBuild? _pendingBuild;

  /// What the manifest of the build allows in a frame.
  FrameOrigins _frameOrigins = FrameOrigins.none;

  /// True once [_configure] has been queued, so layout rebuilds do not repeat it.
  bool _configurationScheduled = false;

  @override
  Future<void> load(PluginBuild build) async {
    final controller = createPluginWebViewController();
    _controller = controller;
    _pendingBuild = build;
    _frameOrigins = build.frameOrigins;

    // The setup waits for the view to exist: on Linux the page lives in a
    // native overlay that is placed on the first frame, and a navigation sent
    // before that is dropped without an error, leaving a black card. Nothing is
    // awaited here either, or the tile would sit on its spinner instead.
  }

  /// Sets the WebView up and loads the document, reporting what fails.
  Future<void> _configure(
    WebViewController controller,
    PluginBuild build,
  ) async {
    try {
      debugPrint('[PluginBridge] $instanceId: configuring the WebView');

      await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
      await controller.setBackgroundColor(const Color(0xFF000000));

      // The console of the sandbox is the only place where a plugin says why
      // it drew nothing: without it a black card has no explanation.
      await controller.setOnConsoleMessage((message) {
        debugPrint(
          '[PluginBridge] $instanceId: console ${message.level.name}: '
          '${message.message}',
        );
      });

      await controller.addJavaScriptChannel(
        BridgeProtocol.handlerName,
        onMessageReceived: _onMessage,
      );

      await controller.setNavigationDelegate(
        NavigationDelegate(onNavigationRequest: _onNavigationRequest),
      );

      debugPrint('[PluginBridge] $instanceId: WebView configured');

      final url = await _document.open(build);

      if (url != null) {
        await controller.loadRequest(url);
      } else if (build.isDocument) {
        await controller.loadHtmlString(build.html!);
      } else {
        return;
      }

      debugPrint('[PluginBridge] $instanceId: document loaded');

      if (kDebugMode) unawaited(_probeDocument(controller));

      if (url != null) unawaited(_watchDocument(controller, url));
    } catch (error) {
      debugPrint('[PluginBridge] $instanceId: configuration failed: $error');
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (_disposed || controller == null) return const SizedBox.shrink();

    final build = _pendingBuild;

    final Widget sandbox;

    if (build == null) {
      sandbox = WebViewWidget(controller: controller);
    } else {
      sandbox = LayoutBuilder(
        builder: (context, constraints) {
          // First frame in which the card really has a size: only now does the
          // native overlay exist, so only now can the document be loaded.
          if (!_configurationScheduled &&
              constraints.maxWidth > 0 &&
              constraints.maxHeight > 0) {
            _configurationScheduled = true;
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _pendingBuild = null;
              if (!_disposed) unawaited(_configure(controller, build));
            });
          }

          return WebViewWidget(controller: controller);
        },
      );
    }

    return sandbox;
  }

  @override
  Future<void> emit(String event, Object? payload) async {
    if (_disposed) return;

    // `loadRequest` returns long before the document runs, so everything sent
    // in that window would reach a page without the SDK: it waits here for the
    // first request of the plugin, which is the proof that the document is
    // alive, and only then goes in, in order.
    if (!_pageReady) {
      if (_pendingEvents.length >= _maxPendingEvents) {
        _pendingEvents.removeAt(0);
      }
      _pendingEvents.add((event: event, payload: payload));
      return;
    }

    await _runInPage(emitScript(event, payload));
  }

  /// Asks the document again only when the navigation was really lost.
  ///
  /// A navigation issued while the native overlay is still settling can be
  /// dropped by the engine: the page stays on `about:blank`, nothing errors and
  /// the card spins forever.
  Future<void> _watchDocument(WebViewController controller, Uri url) async {
    for (var attempt = 0; attempt < 10; attempt++) {
      await Future<void>.delayed(const Duration(seconds: 2));

      if (_disposed || _pageReady) return;

      final state = await _documentState(controller);

      // The page is loading: the engine is working on it, nothing to reload.
      if (state == _DocumentState.loading) continue;

      // The document is up and painting: a reload would only flash it black.
      if (state == _DocumentState.arrived) return;

      debugPrint(
        '[PluginBridge] $instanceId: no document yet, loading again ($attempt)',
      );

      try {
        await controller.loadRequest(url);
      } catch (error) {
        debugPrint('[PluginBridge] $instanceId: reload failed: $error');
      }

      if (attempt.isOdd) {
        try {
          final current = await controller.currentUrl();

          debugPrint('[PluginBridge] $instanceId: current url $current');
        } catch (error) {
          debugPrint('[PluginBridge] $instanceId: current url failed: $error');
        }
      }
    }
  }

  /// What the page holds right now, without touching it.
  Future<_DocumentState> _documentState(WebViewController controller) async {
    try {
      final raw = await controller.runJavaScriptReturningResult(
        _probeScript,
      );
      final text = raw is Map ? jsonEncode(raw) : raw.toString();

      if (!text.contains('"href"')) return _DocumentState.unknown;

      // Still on the blank page the engine starts from: the navigation of our
      // document never landed.
      if (text.contains('"href":"about:blank"')) return _DocumentState.unknown;

      final ready = RegExp(r'"ready":"([a-z]+)"').firstMatch(text)?.group(1);

      return ready == 'loading'
          ? _DocumentState.loading
          : _DocumentState.arrived;
    } catch (error) {
      debugPrint('[PluginBridge] $instanceId: document state failed: $error');
      return _DocumentState.unknown;
    }
  }

  /// Reports what the sandbox really holds, shortly after the load.
  ///
  /// A black card has no other explanation: this says whether the document
  /// arrived, whether the SDK came up with it, and what the page measured. It
  /// stops at the first complete document, or after six seconds.
  Future<void> _probeDocument(WebViewController controller) async {
    for (var attempt = 0; attempt < 8; attempt++) {
      await Future<void>.delayed(const Duration(milliseconds: 750));

      if (_disposed) return;

      try {
        final result = await controller.runJavaScriptReturningResult(
          _probeScript,
        );

        debugPrint('[PluginBridge] $instanceId: probe $result');

        if (result.toString().contains('"ready":"complete"')) return;
      } catch (error) {
        debugPrint('[PluginBridge] $instanceId: probe failed: $error');
        return;
      }
    }
  }

  /// What the page can tell about itself, as one JSON string.
  static const String _probeScript = r'''
(function () {
  var d = document;
  var body = d.body;
  var style = window.getComputedStyle(body || d.documentElement);
  return JSON.stringify({
    ready: d.readyState,
    href: location.href,
    origin: String(location.origin),
    bodyBytes: body ? body.innerHTML.length : -1,
    sdk: typeof window.AppSDK,
    emit: typeof window.__appSdkEmit,
    bg: style.backgroundColor,
    size: window.innerWidth + 'x' + window.innerHeight,
    scripts: d.scripts ? d.scripts.length : -1
  });
})();
''';

  /// Runs [script] in the page, reporting whether it landed.
  Future<bool> _runInPage(String script) async {
    final controller = _controller;
    if (controller == null || _disposed) return false;

    try {
      await controller.runJavaScriptReturningResult(script);
      return true;
    } catch (error) {
      debugPrint('[PluginBridge] $instanceId: delivery postponed: $error');
      return false;
    }
  }

  /// Hands the events queued before the document was alive to the plugin.
  Future<void> _flushPendingEvents() async {
    while (_pendingEvents.isNotEmpty && _pageReady && !_disposed) {
      final next = _pendingEvents.removeAt(0);
      await _runInPage(emitScript(next.event, next.payload));
    }
  }

  @override
  Future<void> dispose() async {
    _disposed = true;

    final controller = _controller;
    _controller = null;

    // On Linux the WebView is a native GTK overlay, not a Flutter widget:
    // dropping the reference leaves it on screen, above every other tile and
    // above the input of the app. It has to be destroyed here.
    // The web engine owns its iframe and exposes no dispose: the dynamic call
    // throws `NoSuchMethodError` there on every close of an activity.
    if (!kIsWeb) {
      try {
        // The disposal lives on the platform implementation and is not part of
        // the shared interface, hence the dynamic call.
        final dynamic platform = controller?.platform;
        await platform?.dispose();
      } catch (error) {
        debugPrint('[PluginBridge] $instanceId: dispose failed: $error');
      }
    }

    await _document.close();
  }

  void _onMessage(JavaScriptMessage message) {
    if (!_pageReady) {
      _pageReady = true;
      debugPrint('[PluginBridge] $instanceId: plugin connected');
      unawaited(_flushPendingEvents());
    }

    unawaited(_answer(message.message));
  }

  Future<void> _answer(Object? raw) async {
    final request = BridgeProtocol.decodeRequest(raw);

    final reply = request == null
        ? const BridgeReply.failure(0, 'E_INTERNAL', 'Malformed request')
        : await onRequest(request);

    final controller = _controller;
    if (controller == null || _disposed) return;

    await _runInPage(replyScript(reply));
  }

  /// Only a navigation of the document itself is the host's business: a
  /// subframe belongs to the plugin (the YouTube player is an iframe that
  /// opens its own pages) and must load inside the sandbox.
  NavigationDecision _onNavigationRequest(NavigationRequest request) {
    final url = request.url;

    // An embed navigates its own frame, and the Linux engine does not always
    // report those requests as subframes: an origin the manifest declared for a
    // frame loads inside the sandbox.
    if (_frameOrigins.allows(url)) return NavigationDecision.navigate;

    if (!request.isMainFrame) return NavigationDecision.navigate;

    if (url.startsWith('file://') ||
        url.startsWith('about:') ||
        url.startsWith('data:') ||
        url.startsWith('blob:')) {
      return NavigationDecision.navigate;
    }

    final origin = _document.origin;
    if (origin != null && url.startsWith(origin)) {
      return NavigationDecision.navigate;
    }

    // Every other main-frame navigation is blocked: external links are not
    // opened.
    return NavigationDecision.prevent;
  }
}
