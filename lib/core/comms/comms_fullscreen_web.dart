import 'dart:js_interop';

import 'package:web/web.dart' as web;

final _webHandlers = <void Function(), JSFunction>{};

bool webIsFullscreen() {
  try {
    return web.document.fullscreenElement != null;
  } catch (_) {
    return false;
  }
}

void webEnterFullscreen() {
  try {
    final element = web.document.documentElement;
    if (element != null && web.document.fullscreenElement == null) {
      element.requestFullscreen();
    }
  } catch (_) {}
}

void webExitFullscreen() {
  try {
    if (web.document.fullscreenElement != null) {
      web.document.exitFullscreen();
    }
  } catch (_) {}
}

Object? webAddFullscreenChangeListener(void Function() callback) {
  try {
    final jsHandler = ((JSAny? _) => callback()).toJS;
    _webHandlers[callback] = jsHandler;
    web.document.addEventListener('fullscreenchange', jsHandler);
    return callback;
  } catch (_) {
    return null;
  }
}

void webRemoveFullscreenChangeListener(Object? token) {
  try {
    if (token == null) return;
    final jsHandler = _webHandlers.remove(token);
    if (jsHandler != null) {
      web.document.removeEventListener('fullscreenchange', jsHandler);
    }
  } catch (_) {}
}
