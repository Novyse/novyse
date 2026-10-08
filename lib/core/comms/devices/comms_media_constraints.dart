import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:livekit_client/livekit_client.dart';

/// Media constraints for voice / video / screen share.
///
/// Free-tier caps enforced here:
/// - Voice: maximum quality (128 kbps stereo music preset).
/// - Webcam: `720p60` or `1080p60` (no 4K; legacy `4k` clamps to `1080p`).
/// - Screen share modes: `fluid` (1080p60), `clarity` (1080p5 coding mode),
///   `custom` (user quality + fps, clamped to 1080p60 max).
abstract final class CommsMediaConstraints {
  // Setting keys (mirror the `comms.*` catalog entries).
  static const noiseSuppressionKey = 'comms.noiseSuppression';
  static const echoCancellationKey = 'comms.echoCancellation';
  static const videoQualityKey = 'comms.videoQuality';
  static const videoFramerateKey = 'comms.videoFramerate';
  static const videoBitrateKey = 'comms.videoBitrate';
  static const shareModeKey = 'comms.shareQuality';
  static const shareCustomQualityKey = 'comms.shareCustomQuality';
  static const shareCustomFpsKey = 'comms.shareCustomFps';
  static const shareCustomBitrateKey = 'comms.shareCustomBitrate';

  // Setting value ids (mirror the catalog option values).
  static const video240p = '240p';
  static const video360p = '360p';
  static const video480p = '480p';
  static const video720p = '720p';
  static const video1080p = '1080p';
  static const video2k = '2k';
  // Disabled paid-plan option: visible in UI, clamped to 2k.
  static const video4k = '4k';

  /// Maximum bitrate allowed on the free tier (1080p @ 30 FPS baseline = 4 Mbps).
  static const int freeTierMaxBitrate = 4000 * 1000;

  static const fps5 = '5';
  static const fps15 = '15';
  static const fps24 = '24';
  static const fps30 = '30';
  static const fps60 = '60';
  static const fps120 = '120';

  static const shareFluid = 'fluid_60';
  static const shareClarity = 'clarity';
  static const shareCustom = 'custom';

  // Defaults (maximum free-tier quality).
  static const defaultNoiseSuppression = true;
  static const defaultEchoCancellation = true;
  static const defaultVideoQuality = video1080p;
  static const defaultVideoFramerate = fps60;
  static const defaultShareMode = shareFluid;
  static const defaultShareCustomQuality = video1080p;
  static const defaultShareCustomFps = fps60;

  static bool readBool(Map<String, Object?> s, String key, bool fallback) {
    final raw = s[key];
    return raw is bool ? raw : fallback;
  }

  static String readString(Map<String, Object?> s, String key, String fb) {
    final raw = s[key];
    if (raw is String && raw.isNotEmpty) return raw;
    return fb;
  }

  /// Audio capture driven purely by the settings JSON.
  static AudioCaptureOptions audioCapture({
    required String? deviceId,
    required bool noiseSuppression,
    required bool echoCancellation,
  }) {
    return AudioCaptureOptions(
      deviceId: deviceId,
      noiseSuppression: noiseSuppression,
      echoCancellation: echoCancellation,
      // Max-quality helpers: always on, not exposed in settings UI.
      autoGainControl: true,
      highPassFilter: true,
      // Apple voice isolation follows the noise-suppression switch so a
      // single toggle controls all noise filtering.
      voiceIsolation: noiseSuppression,
      // Keystroke attenuation is custom DSP (WIP setting) → keep off so the
      // only active processing is the two native WebRTC constraints.
      typingNoiseDetection: false,
    );
  }

  /// Runtime processing update applied live without restarting capture.
  // ignore: experimental_member_use
  static AudioProcessingOptions audioProcessing({
    required bool noiseSuppression,
    required bool echoCancellation,
  }) {
    // ignore: experimental_member_use
    return AudioProcessingOptions(
      echoCancellation: echoCancellation,
      noiseSuppression: noiseSuppression,
      autoGainControl: true,
      highPassFilter: true,
    );
  }

  /// Voice publish encoding: maximum quality (stereo music preset).
  static const AudioPublishOptions maxQualityAudioPublish =
      AudioPublishOptions(
        encoding: AudioEncoding.presetMusicHighQualityStereo,
        dtx: true,
      );

// __PART2__
  /// Custom 720p60 capture preset (LiveKit only ships 720p30 for cameras).
  static const VideoParameters video720p60 = VideoParameters(
    dimensions: VideoDimensionsPresets.h720_169,
    encoding: VideoEncoding(maxBitrate: 2800 * 1000, maxFramerate: 60),
  );

  /// Custom 1080p60 capture preset (LiveKit only ships 1080p30 for cameras).
  static const VideoParameters video1080p60 = VideoParameters(
    dimensions: VideoDimensionsPresets.h1080_169,
    encoding: VideoEncoding(maxBitrate: 5000 * 1000, maxFramerate: 60),
  );

  /// Custom 1080p60 screen-share preset.
  static const VideoParameters share1080p60 = VideoParameters(
    dimensions: VideoDimensionsPresets.h1080_169,
    encoding: VideoEncoding(maxBitrate: 10000 * 1000, maxFramerate: 60),
  );

  /// Custom 1080p5 coding-mode screen-share preset: very few fps so each
  /// delivered frame stays sharp (static text / code)
  static const VideoParameters share1080p5 = VideoParameters(
    dimensions: VideoDimensionsPresets.h1080_169,
    encoding: VideoEncoding(maxBitrate: 4000 * 1000, maxFramerate: 5),
  );

  /// Normalized quality id ensuring a supported identifier.
  static String normalizeQualityId(String stored) {
    return switch (stored) {
      video240p => video240p,
      video360p => video360p,
      video480p => video480p,
      video720p => video720p,
      video1080p => video1080p,
      video2k => video2k,
      video4k => video4k,
      _ => defaultVideoQuality,
    };
  }

  /// Effective quality id after clamping.
  static String resolveVideoQuality(String stored) {
    final normalized = normalizeQualityId(stored);
    if (normalized == video4k) return video2k;
    return normalized;
  }

  /// Resolution dimensions corresponding to a quality id.
  static VideoDimensions dimensionsFor(String qualityId) {
    return switch (normalizeQualityId(qualityId)) {
      video240p => const VideoDimensions(426, 240),
      video360p => VideoDimensionsPresets.h360_169,
      video480p => const VideoDimensions(854, 480),
      video720p => VideoDimensionsPresets.h720_169,
      video1080p => VideoDimensionsPresets.h1080_169,
      video2k => VideoDimensionsPresets.h1440_169,
      video4k => VideoDimensionsPresets.h2160_169,
      _ => VideoDimensionsPresets.h1080_169,
    };
  }

  /// Decent bitrate budget proportional to resolution and framerate.
  static int bitrateFor(String qualityId, int fps) {
    final base30 = switch (normalizeQualityId(qualityId)) {
      video240p => 400 * 1000,
      video360p => 700 * 1000,
      video480p => 1200 * 1000,
      video720p => 2500 * 1000,
      video1080p => freeTierMaxBitrate,
      video2k => 8000 * 1000,
      video4k => 16000 * 1000,
      _ => freeTierMaxBitrate,
    };
    final calculated = (base30 * (fps / 30.0)).round();
    return calculated.clamp(150 * 1000, 30000 * 1000);
  }

  /// Effective fps parsed from the stored id (clamped to 120 max).
  static int resolveVideoFps(String qualityId, String fpsId) {
    resolveVideoQuality(qualityId);
    return switch (fpsId) {
      fps5 => 5,
      fps15 => 15,
      fps24 => 24,
      fps30 => 30,
      fps60 => 60,
      fps120 => 120,
      _ => 60,
    };
  }

  /// Capture preset for any supported quality/fps pair.
  static VideoParameters videoParamsFor(String qualityId, int fps) {
    final resolved = resolveVideoQuality(qualityId);
    return VideoParameters(
      dimensions: dimensionsFor(resolved),
      encoding: VideoEncoding(
        maxBitrate: bitrateFor(resolved, fps),
        maxFramerate: fps,
      ),
    );
  }

  static VideoParameters resolveVideoParams(
    String qualityId,
    String fpsId, {
    int? maxBitrateKbps,
  }) {
    final quality = resolveVideoQuality(qualityId);
    final fps = resolveVideoFps(quality, fpsId);
    if (maxBitrateKbps != null) {
      final normalized = normalizeQualityId(quality);
      return VideoParameters(
        dimensions: dimensionsFor(normalized),
        encoding: VideoEncoding(
          maxBitrate: maxBitrateKbps * 1000,
          maxFramerate: fps,
        ),
      );
    }
    if (quality == video720p && fps == 60) return video720p60;
    if (quality == video1080p && fps == 60) return video1080p60;
    return videoParamsFor(quality, fps);
  }

  static CameraCaptureOptions cameraCapture({
    required String? deviceId,
    required String qualityId,
    required String fpsId,
    int? maxBitrateKbps,
  }) {
    final quality = resolveVideoQuality(qualityId);
    final fps = resolveVideoFps(quality, fpsId);
    return CameraCaptureOptions(
      deviceId: deviceId,
      params: resolveVideoParams(
        quality,
        fpsId,
        maxBitrateKbps: maxBitrateKbps,
      ),
      maxFrameRate: fps.toDouble(),
    );
  }

  // Screen share modes: fluid (1080p60), clarity (1080p5 coding mode),
  // custom (user quality + fps).
  static String resolveShareMode(String stored) {
    return switch (stored) {
      shareFluid => shareFluid,
      shareClarity => shareClarity,
      shareCustom => shareCustom,
      _ => defaultShareMode,
    };
  }

  /// Share preset for any quality/fps pair.
  static VideoParameters shareParamsFor(
    String qualityId,
    int fps, {
    int? maxBitrateKbps,
  }) {
    final normalized = normalizeQualityId(qualityId);
    final bitrateBps = maxBitrateKbps != null
        ? maxBitrateKbps * 1000
        : bitrateFor(normalized, fps);
    return VideoParameters(
      dimensions: dimensionsFor(normalized),
      encoding: VideoEncoding(
        maxBitrate: bitrateBps,
        maxFramerate: fps,
      ),
    );
  }

  /// Returns the (medium, low) qualities corresponding to the selected top tier.
  static (String medium, String low) simulcastSubLayersFor(String qualityId) {
    return switch (normalizeQualityId(qualityId)) {
      video4k => (video2k, video1080p),
      video2k => (video1080p, video720p),
      video1080p => (video720p, video480p),
      video720p => (video480p, video360p),
      video480p => (video360p, video240p),
      _ => (video720p, video480p),
    };
  }

  /// Simulcast sub-layers (LOW and MEDIUM) sent alongside the top HIGH encoding.
  /// The chosen FPS applies to all layers as requested.
  static List<VideoParameters> shareSimulcastLayersFor(
    String qualityId,
    int fps,
  ) {
    final (medQuality, lowQuality) = simulcastSubLayersFor(qualityId);
    return [
      shareParamsFor(lowQuality, fps),
      shareParamsFor(medQuality, fps),
    ];
  }

  /// Safety clamping: the effective streaming resolution cannot exceed the
  /// native resolution of the captured screen or window.
  static String clampQualityToResolution(
    String qualityId,
    int width,
    int height,
  ) {
    final maxDim = math.max(width, height);
    if (maxDim <= 0) return qualityId;
    if (maxDim < 854) return video480p;
    if (maxDim < 1280 && qualityId != video480p) {
      return video480p;
    }
    if (maxDim < 1920 &&
        (qualityId == video1080p ||
            qualityId == video2k ||
            qualityId == video4k)) {
      return video720p;
    }
    if (maxDim < 2560 && (qualityId == video2k || qualityId == video4k)) {
      return video1080p;
    }
    if (maxDim < 3840 && qualityId == video4k) {
      return video2k;
    }
    return qualityId;
  }

  /// Effective share capture params from the full settings map.
  /// Non-custom modes ignore the custom rows; custom combines them.
  static VideoParameters resolveShareParamsFrom(Map<String, Object?> s) {
    final mode = resolveShareMode(readString(s, shareModeKey, defaultShareMode));
    return switch (mode) {
      shareClarity => share1080p5,
      shareCustom => () {
        final rawBitrate = s[shareCustomBitrateKey];
        final bitrateKbps = switch (rawBitrate) {
          final int v => v,
          final num v => v.toInt(),
          final String v => int.tryParse(v),
          _ => null,
        };
        return shareParamsFor(
          resolveVideoQuality(
            readString(s, shareCustomQualityKey, defaultShareCustomQuality),
          ),
          resolveVideoFps(
            '',
            readString(s, shareCustomFpsKey, defaultShareCustomFps),
          ),
          maxBitrateKbps: bitrateKbps,
        );
      }(),
      _ => share1080p60,
    };
  }

  static double resolveShareMaxFrameRateFrom(Map<String, Object?> s) {
    final mode = resolveShareMode(readString(s, shareModeKey, defaultShareMode));
    return switch (mode) {
      shareClarity => 5.0,
      shareCustom => resolveVideoFps(
        '',
        readString(s, shareCustomFpsKey, defaultShareCustomFps),
      ).toDouble(),
      _ => 60.0,
    };
  }

  static ScreenShareCaptureOptions screenShareCaptureFrom(
    Map<String, Object?> s, {
    String? sourceId,
    required bool captureScreenAudio,
  }) {
    return ScreenShareCaptureOptions(
      sourceId: sourceId,
      captureScreenAudio: captureScreenAudio,
      params: resolveShareParamsFrom(s),
      maxFrameRate: resolveShareMaxFrameRateFrom(s),
    );
  }

  /// Explicit camera publish options derived from the settings map.
  static VideoPublishOptions cameraPublishFrom(Map<String, Object?> s) {
    final quality = resolveVideoQuality(
      readString(s, videoQualityKey, defaultVideoQuality),
    );
    final fps = resolveVideoFps(
      quality,
      readString(s, videoFramerateKey, defaultVideoFramerate),
    );
    final rawBitrate = s[videoBitrateKey];
    final bitrateKbps = switch (rawBitrate) {
      final int v => v,
      final num v => v.toInt(),
      final String v => int.tryParse(v),
      _ => null,
    };
    final top = resolveVideoParams(
      quality,
      '$fps',
      maxBitrateKbps: bitrateKbps,
    );
    final subLayers = cameraSimulcastLayersFor(quality, fps);
    debugCommsMedia(
      'camera publish opts: quality=$quality fps=$fps '
      'bitrate=${top.encoding?.maxBitrate}',
    );
    return VideoPublishOptions(
      simulcast: true,
      videoCodec: 'vp8',
      videoEncoding: top.encoding,
      videoSimulcastLayers: subLayers,
      degradationPreference: DegradationPreference.maintainFramerate,
    );
  }

  /// Camera simulcast sub-layers (LOW and MEDIUM) sent alongside the top HIGH encoding.
  /// The chosen FPS applies to all layers identically.
  static List<VideoParameters> cameraSimulcastLayersFor(
    String qualityId,
    int fps,
  ) {
    final (medQuality, lowQuality) = simulcastSubLayersFor(qualityId);
    return [
      videoParamsFor(lowQuality, fps),
      videoParamsFor(medQuality, fps),
    ];
  }

  /// Camera simulcast encodings (low, medium, high) matching the cascade.
  static List<VideoEncoding> cameraSimulcastEncodingsFor(
    VideoEncoding top, {
    String? qualityId,
  }) {
    final fps = top.maxFramerate;
    final quality = qualityId ?? defaultVideoQuality;
    final (medQuality, lowQuality) = simulcastSubLayersFor(quality);
    final low = videoParamsFor(lowQuality, fps);
    final med = videoParamsFor(medQuality, fps);
    return [
      low.encoding!,
      med.encoding!,
      top,
    ];
  }

  /// Explicit screen-share publish options derived from the settings map.
  static VideoPublishOptions sharePublishFrom(Map<String, Object?> s) {
    final params = resolveShareParamsFrom(s);
    final mode = resolveShareMode(
      readString(s, shareModeKey, defaultShareMode),
    );
    debugCommsMedia(
      'share publish opts: mode=$mode '
      '${params.dimensions.width}x${params.dimensions.height} '
      'fps=${params.encoding?.maxFramerate} '
      'bitrate=${params.encoding?.maxBitrate}',
    );
    return VideoPublishOptions(
      simulcast: false,
      screenShareEncoding: params.encoding,
      degradationPreference: DegradationPreference.maintainResolution,
    );
  }

  /// Debug log helper for media settings plumbing (kept for diagnostics).
  static void debugCommsMedia(String message) {
    debugPrint('[CommsMedia] $message');
  }
}

