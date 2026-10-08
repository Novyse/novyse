import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/devices/comms_media_constraints.dart';
import 'package:novyse/core/comms/devices/comms_quality_options.dart';
import 'package:novyse/core/l10n/app_localizations_en.dart';

/// The unified quality options are the single source for the settings
/// catalog and the share setup/edit menus: ids, labels, defaults and
/// option lists must stay consistent with [CommsMediaConstraints].
void main() {
  final en = AppLocalizationsEn();

  group('CommsQualityOptions ids', () {
    test('video qualities run 480p to 4k with 4k disabled', () {
      expect(CommsQualityOptions.videoQualities, [
        '480p',
        '720p',
        '1080p',
        '2k',
        '4k',
      ]);
      expect(
        CommsQualityOptions.disabledVideoQualities,
        contains(CommsMediaConstraints.video4k),
      );
      expect(
        CommsQualityOptions.disabledVideoQualities,
        isNot(contains(CommsMediaConstraints.video2k)),
      );
    });

    test('fps values are shared by video and custom share', () {
      expect(CommsQualityOptions.fpsValues, [
        '5',
        '15',
        '24',
        '30',
        '60',
        '120',
      ]);
    });

    test('share modes are smooth, text, gaming and custom', () {
      expect(CommsQualityOptions.shareModes, [
        'smooth',
        'text',
        'gaming',
        'custom',
      ]);
    });

    test('custom share qualities mirror the video scale', () {
      expect(
        CommsQualityOptions.shareCustomQualities,
        CommsQualityOptions.videoQualities,
      );
    });
  });

  group('CommsQualityOptions labels', () {
    test('quality labels resolve', () {
      expect(
        CommsQualityOptions.qualityLabel(en, '480p'),
        en.settingsOptionVideoQuality480pLabel,
      );
      expect(
        CommsQualityOptions.qualityLabel(en, '1080p'),
        en.settingsOptionVideoQuality1080pLabel,
      );
      expect(
        CommsQualityOptions.qualityLabel(en, '2k'),
        en.settingsOptionVideoQuality2kLabel,
      );
    });

    test('fps labels resolve', () {
      expect(
        CommsQualityOptions.fpsLabel(en, '60'),
        en.settingsOptionVideoFps60Label,
      );
      expect(
        CommsQualityOptions.fpsLabel(en, '5'),
        en.settingsOptionVideoFps5Label,
      );
    });

    test('share mode labels resolve', () {
      expect(
        CommsQualityOptions.shareModeLabel(en, 'smooth'),
        en.settingsOptionShareQualitySmoothLabel,
      );
      expect(
        CommsQualityOptions.shareModeLabel(en, 'text'),
        en.settingsOptionShareQualityTextLabel,
      );
      expect(
        CommsQualityOptions.shareModeLabel(en, 'gaming'),
        en.settingsOptionShareQualityGamingLabel,
      );
      expect(
        CommsQualityOptions.shareModeLabel(en, 'custom'),
        en.settingsOptionShareQualityCustomLabel,
      );
      // Legacy backward-compatibility
      expect(
        CommsQualityOptions.shareModeLabel(en, 'fluid_60'),
        en.settingsOptionShareQualitySmoothLabel,
      );
      expect(
        CommsQualityOptions.shareModeLabel(en, 'clarity'),
        en.settingsOptionShareQualityTextLabel,
      );
    });
  });

  group('CommsQualityOptions settings builders', () {
    test('video quality options disable only 4k', () {
      final options = CommsQualityOptions.videoQualityOptions();
      expect(options.map((o) => o.value), [
        '480p',
        '720p',
        '1080p',
        '2k',
        '4k',
      ]);
      expect(options.where((o) => o.disabled).map((o) => o.value), ['4k']);
      expect(
        options.firstWhere((o) => o.value == '720p').label(en),
        en.settingsOptionVideoQuality720pLabel,
      );
    });

    test('fps options are all enabled', () {
      final options = CommsQualityOptions.fpsOptions();
      expect(options.map((o) => o.value), [
        '5',
        '15',
        '24',
        '30',
        '60',
        '120',
      ]);
      expect(options.where((o) => o.disabled), isEmpty);
    });

    test('share mode options carry the four modes', () {
      final options = CommsQualityOptions.shareModeOptions();
      expect(options.map((o) => o.value), [
        'smooth',
        'text',
        'gaming',
        'custom',
      ]);
    });

    test('custom share quality options disable only 4k', () {
      final options = CommsQualityOptions.shareCustomQualityOptions();
      expect(options.where((o) => o.disabled).map((o) => o.value), ['4k']);
    });
  });
}

