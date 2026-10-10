import 'dart:async';

import 'comms_web_audio_stub.dart'
    if (dart.library.html) 'comms_web_audio_web.dart' as impl;

const webAudioElementPrefix = 'livekit_audio_';

String webAudioElementId(String cid) => '$webAudioElementPrefix$cid';

bool setWebAudioVolume(String cid, double volume) =>
    impl.setElementVolume(cid, volume.clamp(0.0, 1.0));

void applyWebAudioVolume(String cid, double volume) {
  if (setWebAudioVolume(cid, volume)) return;
  const delays = [Duration(milliseconds: 400), Duration(milliseconds: 1200)];
  Future<void> attempt(int i) async {
    if (i >= delays.length) return;
    await Future.delayed(delays[i]);
    try {
      if (setWebAudioVolume(cid, volume)) return;
    } catch (_) {
      return;
    }
    await attempt(i + 1);
  }

  unawaited(attempt(0));
}
