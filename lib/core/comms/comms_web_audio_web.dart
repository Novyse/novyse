import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'package:web/web.dart' as web;

import 'comms_web_audio.dart' show webAudioElementId;

bool setElementVolume(String cid, double volume) {
  try {
    final el = web.document.getElementById(webAudioElementId(cid));
    if (el == null) return false;
    el.setProperty('volume'.toJS, volume.toJS);
    return true;
  } catch (_) {}
  return false;
}
