import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/devices/comms_bitrate_options.dart';

void main() {
  group('CommsBitrateOptions ranges', () {
    test('1080p60 range and default are the average of min and max', () {
      final range = CommsBitrateOptions.rangeFor(60);
      expect(range, CommsBitrateOptions.fhd60);
      // (1500 + 10000) / 2 = 5750, rounded to the 500 kbps step.
      expect(range.defaultKbps, 6000);
    });

    test('120fps uses its own range', () {
      final range = CommsBitrateOptions.rangeFor(120);
      expect(range, CommsBitrateOptions.fps120);
      expect(range.defaultKbps, 9000);
    });

    test('480p60 and 1080p60 have different min, default and max bitrates', () {
      final range480 = CommsBitrateOptions.rangeFor(60, quality: '480p');
      final range1080 = CommsBitrateOptions.rangeFor(60, quality: '1080p');

      expect(range480.minKbps, isNot(equals(range1080.minKbps)));
      expect(range480.defaultKbps, isNot(equals(range1080.defaultKbps)));
      expect(range480.maxKbps, isNot(equals(range1080.maxKbps)));

      expect(range480.minKbps, 500);
      expect(range480.defaultKbps, 1500);
      expect(range480.maxKbps, 2500);

      expect(range1080.minKbps, 1500);
      expect(range1080.defaultKbps, 6000);
      expect(range1080.maxKbps, 10000);
    });

    test('480p30 and 480p60 have different bitrates', () {
      final range30 = CommsBitrateOptions.rangeFor(30, quality: '480p');
      final range60 = CommsBitrateOptions.rangeFor(60, quality: '480p');

      expect(range30.defaultKbps, 1000);
      expect(range60.defaultKbps, 1500);
      expect(range30.maxKbps, lessThan(range60.maxKbps));
    });

    test('defaults are aligned to the stepper step', () {
      for (final quality in ['480p', '720p', '1080p', '2k']) {
        for (final fps in [5, 15, 24, 30, 60, 120]) {
          final range = CommsBitrateOptions.rangeFor(fps, quality: quality);
          expect(range.defaultKbps % CommsBitrateOptions.stepKbps, 0);
          expect(range.minKbps % CommsBitrateOptions.stepKbps, 0);
          expect(range.maxKbps % CommsBitrateOptions.stepKbps, 0);
          expect(range.minKbps, lessThanOrEqualTo(range.defaultKbps));
          expect(range.defaultKbps, lessThanOrEqualTo(range.maxKbps));
        }
      }
    });
  });

  group('CommsBitrateOptions.validate', () {
    test('accepts a value inside the range for free users', () {
      expect(
        CommsBitrateOptions.validate(kbps: 5000, fps: 60, isPremium: false),
        CommsBitrateError.none,
      );
    });

    test('reports below-min and above-max against the fps range', () {
      expect(
        CommsBitrateOptions.validate(kbps: 1000, fps: 60, isPremium: true),
        CommsBitrateError.belowMin,
      );
      expect(
        CommsBitrateOptions.validate(kbps: 12000, fps: 60, isPremium: true),
        CommsBitrateError.aboveMax,
      );
    });

    test('free tier blocks values above the 8000 kbps cap', () {
      expect(
        CommsBitrateOptions.validate(
          kbps: CommsBitrateOptions.freeTierMaxKbps + 500,
          fps: 60,
          isPremium: false,
        ),
        CommsBitrateError.premiumLimit,
      );
    });

    test('premium users are not limited by the free-tier cap', () {
      expect(
        CommsBitrateOptions.validate(
          kbps: CommsBitrateOptions.freeTierMaxKbps + 500,
          fps: 60,
          isPremium: true,
        ),
        CommsBitrateError.none,
      );
    });

    test('validates against specific quality range', () {
      expect(
        CommsBitrateOptions.validate(
          kbps: 3000,
          fps: 60,
          quality: '1080p',
          isPremium: false,
        ),
        CommsBitrateError.none,
      );
      expect(
        CommsBitrateOptions.validate(
          kbps: 3000,
          fps: 60,
          quality: '480p',
          isPremium: false,
        ),
        CommsBitrateError.aboveMax,
      );
    });
  });
}
