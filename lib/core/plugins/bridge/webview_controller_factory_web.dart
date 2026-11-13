import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:webview_all/webview_all.dart';
import 'package:webview_all_web/webview_all_web.dart';

/// The sandbox controller of the web build.
WebViewController createPluginWebViewController() {
  final controller = WebViewController.fromPlatformCreationParams(
    WebWebViewControllerCreationParams(
      iFrameSandbox: 'allow-scripts allow-same-origin',
    ),
  );

  final platform = controller.platform;

  if (platform is WebWebViewController) {
    unawaited(
      platform.setIFrameAttribute('style', _frameStyle).catchError((
        Object error,
      ) {
        debugPrint('[PluginBridge] iframe style failed: $error');
      }),
    );
  }

  return controller;
}

/// Width and height are repeated because the `style` attribute replaces the
/// inline style the controller sets at creation.
const String _frameStyle =
    'width:100%;height:100%;border:0;display:block;'
    'overflow:hidden;border-radius:24px;';
