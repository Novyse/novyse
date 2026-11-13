import 'package:webview_all/webview_all.dart';

/// The sandbox controller of the desktop and mobile builds.
///
/// Android, iOS and macOS use the system WebView, Windows the WebView2 runtime,
/// Linux WebKitGTK: every engine already ships with the OS, none with the app.
WebViewController createPluginWebViewController() => WebViewController();
