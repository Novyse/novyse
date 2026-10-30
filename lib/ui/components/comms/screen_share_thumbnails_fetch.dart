import 'dart:typed_data';

import 'package:flutter_webrtc/flutter_webrtc.dart';
// ignore: implementation_imports
import 'package:flutter_webrtc/src/native/desktop_capturer_impl.dart';

/// Whether the running platform plugs a native desktop capturer with
/// per-source thumbnails (false on web and on stub implementations).
bool get hasNativeDesktopCapturer => desktopCapturer is DesktopCapturerNative;

/// Fetches one thumbnail of a desktop source as raw bytes. The retry and
/// never-throw policies belong to the caller: returns null when the capture
/// fails (minimized/occluded windows) or nothing arrives.
Future<Uint8List?> fetchDesktopSourceThumbnail(
  DesktopCapturerSource source,
) async {
  final capturer = desktopCapturer;
  if (capturer is! DesktopCapturerNative) return null;
  if (source is! DesktopCapturerSourceNative) return null;
  try {
    return await capturer.getThumbnail(source);
  } catch (_) {
    return null;
  }
}
