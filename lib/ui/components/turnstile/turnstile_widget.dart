import 'dart:convert';
import 'dart:io';

import 'package:material_ui/material_ui.dart';
import 'package:webview_all/webview_all.dart';

import '../../../core/utils/platform.dart';

/// A universal Turnstile widget supporting Web, Mobile (Android/iOS),
/// and Desktop (Windows, macOS, Linux) via [webview_all].
class TurnstileWidget extends StatefulWidget {
  const TurnstileWidget({
    super.key,
    required this.siteKey,
    required this.baseUrl,
    this.action,
    this.theme = 'dark',
    this.language,
    this.width = 300,
    this.height = 70,
    this.onTokenReceived,
    this.onTokenExpired,
    this.onError,
  });

  /// The Turnstile public site key.
  final String siteKey;

  /// The base URL used to resolve relative URLs and as the document origin
  /// when the HTML is loaded inline.
  final String baseUrl;

  /// Optional action name for reporting (e.g. 'login', 'signup').
  final String? action;

  /// Widget theme ('dark', 'light', or 'auto').
  final String theme;

  /// Optional language ISO code.
  final String? language;

  /// Width of the Turnstile container widget.
  final double width;

  /// Height of the Turnstile container widget.
  final double height;

  /// Called when a valid Turnstile token is generated.
  final ValueChanged<String>? onTokenReceived;

  /// Called when the current Turnstile token expires.
  final VoidCallback? onTokenExpired;

  /// Called when Turnstile encounters an error.
  final ValueChanged<String>? onError;

  @override
  State<TurnstileWidget> createState() => _TurnstileWidgetState();
}

class _TurnstileWidgetState extends State<TurnstileWidget> {
  WebViewController? _controller;
  HttpServer? _server;
  bool _initScheduled = false;
  bool _isInitialized = false;
  bool _isDisposed = false;

  @override
  void dispose() {
    _isDisposed = true;
    _server?.close(force: true);
    super.dispose();
  }

  /// Creates the platform view only after the container has been laid out with
  /// a real size. Rendering the challenge before that leaves Turnstile in its
  /// own error/retry state, which is what showed up as a pre-filled error on
  /// Android.
  void _scheduleInitialization() {
    if (_initScheduled || _isInitialized) return;
    _initScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_isDisposed || _isInitialized) return;
      _initController();
    });
  }

  Future<void> _initController() async {
    final controller = WebViewController();
    _controller = controller;
    await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
    await controller.setBackgroundColor(Colors.transparent);
    await controller.addJavaScriptChannel(
      'TurnstileBridge',
      onMessageReceived: _handleJavaScriptMessage,
    );

    final html = _generateHtml();
    final isWindows = currentOS == AppOS.windows;

    if (isWindows) {
      try {
        final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
        if (_isDisposed) {
          await server.close(force: true);
          return;
        }
        _server = server;
        server.listen((HttpRequest request) {
          request.response
            ..headers.contentType = ContentType.html
            ..headers.set('Access-Control-Allow-Origin', '*')
            ..write(html)
            ..close();
        });
        await controller.loadRequest(
          Uri.parse('http://localhost:${server.port}'),
        );
      } catch (e) {
        debugPrint('[Turnstile] Loopback server failed: $e');
        await controller.loadHtmlString(html, baseUrl: widget.baseUrl);
      }
    } else {
      await controller.loadHtmlString(html, baseUrl: widget.baseUrl);
    }

    if (_isDisposed || !mounted) return;
    setState(() => _isInitialized = true);
  }

  void _handleJavaScriptMessage(JavaScriptMessage message) {
    try {
      final data = jsonDecode(message.message) as Map<String, dynamic>;
      final type = data['type'] as String?;

      switch (type) {
        case 'token':
          final token = data['value'] as String?;
          if (token != null && token.isNotEmpty) {
            widget.onTokenReceived?.call(token);
          }
          break;
        case 'expired':
          widget.onTokenExpired?.call();
          break;
        case 'error':
          final errorVal = data['value']?.toString() ?? 'unknown error';
          widget.onError?.call(errorVal);
          break;
      }
    } catch (e) {
      widget.onError?.call(e.toString());
    }
  }

  String _generateHtml() {
    final siteKey = jsonEncode(widget.siteKey);
    final theme = jsonEncode(widget.theme);
    final actionParam = widget.action != null
        ? 'action: ${jsonEncode(widget.action)},'
        : '';
    final langParam = widget.language != null
        ? 'language: ${jsonEncode(widget.language)},'
        : '';

    return '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      background-color: transparent !important;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
    }
    #cf-turnstile-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <div id="cf-turnstile-container"></div>
  <script>
    var rendered = false;
    var widgetId = null;
    var errorCount = 0;
    var loadDeadline = Date.now() + 20000;

    function postToApp(type, value) {
      if (!window.TurnstileBridge) return;
      var payload = { type: type };
      if (value !== undefined && value !== null) {
        payload.value = String(value);
      }
      TurnstileBridge.postMessage(JSON.stringify(payload));
    }

    function renderTurnstile() {
      if (rendered) return;

      // The challenge is only rendered by the page itself once the script is
      // available and the container is measurable. Reporting is left to this
      // page (error-callback or this timeout), never to WebView resource
      // errors.
      if (Date.now() > loadDeadline) {
        postToApp('error', 'turnstile-load-timeout');
        return;
      }

      var container = document.getElementById('cf-turnstile-container');
      if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
        setTimeout(renderTurnstile, 50);
        return;
      }

      if (!window.turnstile || typeof window.turnstile.render !== 'function') {
        setTimeout(renderTurnstile, 50);
        return;
      }

      rendered = true;
      try {
        widgetId = window.turnstile.render('#cf-turnstile-container', {
          sitekey: $siteKey,
          theme: $theme,
          $actionParam
          $langParam
          callback: function(token) {
            postToApp('token', token);
          },
          'expired-callback': function() {
            postToApp('expired');
          },
          'error-callback': function(error) {
            // The first error is usually transient on Android (cold WebView or
            // a subresource that failed once). Reset the challenge once and
            // only bubble the error if it fails again.
            if (errorCount === 0 && widgetId !== null) {
              errorCount++;
              setTimeout(function() {
                try {
                  window.turnstile.reset(widgetId);
                } catch (e) {
                  postToApp('error', String(e));
                }
              }, 0);
              return;
            }
            errorCount++;
            postToApp('error', String(error));
          }
        });
      } catch (e) {
        postToApp('error', String(e));
      }
    }

    window.addEventListener('load', renderTurnstile);
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      renderTurnstile();
    }
  </script>
</body>
</html>''';
  }

  Widget _buildLoading() {
    return const Center(
      child: SizedBox(
        width: 24,
        height: 24,
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: widget.width,
      height: widget.height,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final hasSize =
              constraints.maxWidth.isFinite &&
              constraints.maxHeight.isFinite &&
              constraints.maxWidth > 0 &&
              constraints.maxHeight > 0;
          if (hasSize) _scheduleInitialization();

          final controller = _controller;
          if (!_isInitialized || controller == null) {
            return _buildLoading();
          }

          return WebViewWidget(controller: controller);
        },
      ),
    );
  }
}
