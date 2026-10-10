import 'package:novyse/core/comms/devices/comms_media_constraints.dart';

/// Result of checking a screen-share bitrate before starting a share.
enum CommsBitrateError { none, belowMin, aboveMax, premiumLimit }

/// Allowed bitrate window (kbps) for one framerate and resolution profile.
class CommsBitrateRange {
  final int minKbps;
  final int maxKbps;

  const CommsBitrateRange({required this.minKbps, required this.maxKbps});

  /// Average of min and max, rounded to the stepper step.
  int get defaultKbps =>
      CommsBitrateOptions.roundToStep((minKbps + maxKbps) / 2);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CommsBitrateRange &&
          runtimeType == other.runtimeType &&
          minKbps == other.minKbps &&
          maxKbps == other.maxKbps;

  @override
  int get hashCode => Object.hash(minKbps, maxKbps);

  @override
  String toString() =>
      'CommsBitrateRange(min: $minKbps, max: $maxKbps, default: $defaultKbps)';
}

/// Screen-share bitrate limits, the default value and the pre-start checks.
class CommsBitrateOptions {
  CommsBitrateOptions._();

  /// Increment used by the bitrate stepper (kbps).
  static const int stepKbps = 500;

  /// Maximum bitrate on the free tier (kbps).
  /// TODO: planned to drop to 4000 kbps.
  static const int freeTierMaxKbps = 8000;

  /// 1080p at 60 fps.
  static const CommsBitrateRange fhd60 = CommsBitrateRange(
    minKbps: 1500,
    maxKbps: 10000,
  );

  /// Any profile at 120 fps.
  static const CommsBitrateRange fps120 = CommsBitrateRange(
    minKbps: 3000,
    maxKbps: 15000,
  );

  /// Rounds [kbps] to the nearest multiple of [stepKbps].
  static int roundToStep(double kbps) => (kbps / stepKbps).round() * stepKbps;

  /// Baseline bitrate window (kbps) for a given resolution at 60 fps.
  static ({int minKbps, int maxKbps}) _baseRangeForQuality(String quality) {
    final normalized = CommsMediaConstraints.normalizeQualityId(quality);
    return switch (normalized) {
      CommsMediaConstraints.video240p => (minKbps: 500, maxKbps: 1000),
      CommsMediaConstraints.video360p => (minKbps: 500, maxKbps: 1500),
      CommsMediaConstraints.video480p => (minKbps: 500, maxKbps: 2500),
      CommsMediaConstraints.video720p => (minKbps: 1000, maxKbps: 6000),
      CommsMediaConstraints.video1080p => (minKbps: 1500, maxKbps: 10000),
      CommsMediaConstraints.video2k => (minKbps: 2500, maxKbps: 16000),
      CommsMediaConstraints.video4k => (minKbps: 4000, maxKbps: 25000),
      _ => (minKbps: 1500, maxKbps: 10000),
    };
  }

  /// Scaling factors for min and max bitrate based on framerate.
  static ({double minFactor, double maxFactor}) _fpsFactors(int fps) {
    if (fps >= 120) return (minFactor: 2.0, maxFactor: 1.5);
    if (fps >= 60) return (minFactor: 1.0, maxFactor: 1.0);
    if (fps >= 30) return (minFactor: 0.7, maxFactor: 0.6);
    if (fps >= 24) return (minFactor: 0.65, maxFactor: 0.5);
    if (fps >= 15) return (minFactor: 0.55, maxFactor: 0.4);
    return (minFactor: 0.4, maxFactor: 0.3);
  }

  /// Range for the given effective framerate and resolution.
  static CommsBitrateRange rangeFor(
    int fps, {
    String quality = CommsMediaConstraints.defaultVideoQuality,
  }) {
    final base = _baseRangeForQuality(quality);
    final factors = _fpsFactors(fps);

    var rawMin = roundToStep(base.minKbps * factors.minFactor);
    var rawMax = roundToStep(base.maxKbps * factors.maxFactor);

    if (rawMin < stepKbps) rawMin = stepKbps;
    if (rawMax <= rawMin) rawMax = rawMin + stepKbps;

    return CommsBitrateRange(minKbps: rawMin, maxKbps: rawMax);
  }

  /// Checks [kbps] against the range for [fps] and [quality]. The premium limit only
  /// applies to users without Premium.
  static CommsBitrateError validate({
    required int kbps,
    required int fps,
    String quality = CommsMediaConstraints.defaultVideoQuality,
    required bool isPremium,
  }) {
    final range = rangeFor(fps, quality: quality);
    if (kbps < range.minKbps) return CommsBitrateError.belowMin;
    if (kbps > range.maxKbps) return CommsBitrateError.aboveMax;
    if (!isPremium && kbps > freeTierMaxKbps) {
      return CommsBitrateError.premiumLimit;
    }
    return CommsBitrateError.none;
  }
}
