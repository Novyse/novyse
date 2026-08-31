import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:webview_all/webview_all.dart';

import '../../../core/utils/platform.dart';

/// A universal Turnstile widget supporting Web, Mobile (Android/iOS),
/// and Desktop (Windows, macOS, Linux) via [webview_all].
class TurnstileWidget extends StatefulWidget {
  const TurnstileWidget({
    super.key,
    required this.siteKey,
    this.baseUrl = 'http://localhost',
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

  /// The base URL used as fallback.
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
  late final WebViewController _controller;
  HttpServer? _server;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _initController();
  }

  @override
  void dispose() {
    _server?.close(force: true);
    super.dispose();
  }

  Future<void> _initController() async {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..addJavaScriptChannel(
        'TurnstileBridge',
        onMessageReceived: _handleJavaScriptMessage,
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onWebResourceError: (error) {
            widget.onError?.call(error.description);
          },
        ),
      );

    final html = _generateHtml();
    final isWindows = currentOS == AppOS.windows;

    if (isWindows) {
      try {
        _server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
        _server!.listen((HttpRequest request) {
          request.response
            ..headers.contentType = ContentType.html
            ..headers.set('Access-Control-Allow-Origin', '*')
            ..write(html)
            ..close();
        });
        await _controller.loadRequest(
          Uri.parse('http://localhost:${_server!.port}'),
        );
      } catch (_) {
        await _controller.loadHtmlString(html, baseUrl: widget.baseUrl);
      }
    } else {
      await _controller.loadHtmlString(html, baseUrl: widget.baseUrl);
    }

    if (mounted) {
      setState(() => _isInitialized = true);
    }
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
    final actionParam = widget.action != null ? "action: '${widget.action}'," : '';
    final langParam = widget.language != null ? "language: '${widget.language}'," : '';

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
    }
  </style>
</head>
<body>
  <div id="cf-turnstile-container"></div>
  <script>
    var rendered = false;
    function renderTurnstile() {
      if (rendered) return;
      if (window.turnstile && typeof window.turnstile.render === 'function') {
        rendered = true;
        window.turnstile.render('#cf-turnstile-container', {
          sitekey: '${widget.siteKey}',
          theme: '${widget.theme}',
          $actionParam
          $langParam
          callback: function(token) {
            if (window.TurnstileBridge) {
              TurnstileBridge.postMessage(JSON.stringify({ type: 'token', value: token }));
            }
          },
          'expired-callback': function() {
            if (window.TurnstileBridge) {
              TurnstileBridge.postMessage(JSON.stringify({ type: 'expired' }));
            }
          },
          'error-callback': function(error) {
            if (window.TurnstileBridge) {
              TurnstileBridge.postMessage(JSON.stringify({ type: 'error', value: String(error) }));
            }
          }
        });
      } else {
        setTimeout(renderTurnstile, 50);
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

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized) {
      return SizedBox(
        width: widget.width,
        height: widget.height,
      );
    }

    return SizedBox(
      width: widget.width,
      height: widget.height,
      child: WebViewWidget(controller: _controller),
    );
  }
}
