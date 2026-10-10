import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/comms_share_config.dart';
import 'package:novyse/core/comms/devices/comms_media_constraints.dart';

void main() {
  group('ScreenShareConfig', () {
    test('defaults match the settings defaults', () {
      const config = ScreenShareConfig();
      expect(config.mode, CommsMediaConstraints.defaultShareMode);
      expect(
        config.customQuality,
        CommsMediaConstraints.defaultShareCustomQuality,
      );
      expect(config.customFps, CommsMediaConstraints.defaultShareCustomFps);
    });

    test('fromSettings snapshots the settings map', () {
      final config = ScreenShareConfig.fromSettings({
        CommsMediaConstraints.shareModeKey: CommsMediaConstraints.shareCustom,
        CommsMediaConstraints.shareCustomQualityKey:
            CommsMediaConstraints.video240p,
        CommsMediaConstraints.shareCustomFpsKey: CommsMediaConstraints.fps15,
      });
      expect(config.mode, CommsMediaConstraints.shareCustom);
      expect(config.customQuality, CommsMediaConstraints.video240p);
      expect(config.customFps, CommsMediaConstraints.fps15);
    });

    test('fromSettings falls back to defaults when unset', () {
      final config = ScreenShareConfig.fromSettings({});
      expect(config.mode, CommsMediaConstraints.defaultShareMode);
    });

    test('smooth resolves to the 1080p60 preset', () {
      const config = ScreenShareConfig(mode: CommsMediaConstraints.shareSmooth);
      final params = config.resolveParams();
      expect(params.dimensions.width, 1920);
      expect(params.encoding?.maxFramerate, 60);
    });

    test('text resolves to the 1080p5 coding preset', () {
      const config = ScreenShareConfig(mode: CommsMediaConstraints.shareText);
      final params = config.resolveParams();
      expect(params.dimensions.width, 1920);
      expect(params.encoding?.maxFramerate, 5);
      expect(config.resolveMaxFrameRate(), 5.0);
    });

    test('gaming resolves to the 720p120 preset', () {
      const config = ScreenShareConfig(mode: CommsMediaConstraints.shareGaming);
      final params = config.resolveParams();
      expect(params.dimensions.width, 1280);
      expect(params.encoding?.maxFramerate, 120);
      expect(config.resolveMaxFrameRate(), 120.0);
    });

    test('legacy fluid resolves to the 1080p60 preset', () {
      const config = ScreenShareConfig(mode: 'fluid_60');
      final params = config.resolveParams();
      expect(params.dimensions.width, 1920);
      expect(params.encoding?.maxFramerate, 60);
    });

    test('legacy clarity resolves to the 1080p5 coding preset', () {
      const config = ScreenShareConfig(mode: 'clarity');
      final params = config.resolveParams();
      expect(params.dimensions.width, 1920);
      expect(params.encoding?.maxFramerate, 5);
      expect(config.resolveMaxFrameRate(), 5.0);
    });

    test('custom 240p/15fps resolves to the small preset', () {
      const config = ScreenShareConfig(
        mode: CommsMediaConstraints.shareCustom,
        customQuality: CommsMediaConstraints.video240p,
        customFps: CommsMediaConstraints.fps15,
      );
      final params = config.resolveParams();
      expect(params.dimensions.width, 426);
      expect(params.encoding?.maxFramerate, 15);
      expect(params.encoding?.maxBitrate, 200 * 1000);
    });

    test('publish options carry top encoding and simulcast sub-layers', () {
      const config = ScreenShareConfig(
        mode: CommsMediaConstraints.shareCustom,
        customQuality: CommsMediaConstraints.video480p,
        customFps: CommsMediaConstraints.fps30,
      );
      final options = config.publishOptions();
      expect(options.simulcast, isTrue);
      expect(options.videoCodec, 'vp8');
      expect(options.screenShareEncoding?.maxFramerate, 30);
      expect(options.screenShareEncoding?.maxBitrate, 1200 * 1000);
      expect(options.screenShareSimulcastLayers.length, 2);
      // Sublayers cascade down for 480p: low is 240p, medium is 360p
      final low = options.screenShareSimulcastLayers[0];
      final med = options.screenShareSimulcastLayers[1];
      expect(low.dimensions.height, 240);
      expect(low.encoding?.maxFramerate, 30);
      expect(med.dimensions.height, 360);
      expect(med.encoding?.maxFramerate, 30);
    });

    test('bitrate override sets the encoding max bitrate in bps', () {
      const config = ScreenShareConfig(maxBitrateKbps: 6000);
      final params = config.resolveParams();
      expect(params.encoding?.maxBitrate, 6000 * 1000);
      expect(params.encoding?.maxFramerate, 60);
    });

    test('null bitrate keeps the preset encoding', () {
      const config = ScreenShareConfig();
      expect(config.maxBitrateKbps, isNull);
      expect(
        config.resolveParams().encoding?.maxBitrate,
        CommsMediaConstraints.shareParamsFor(
          CommsMediaConstraints.video1080p,
          60,
        ).encoding?.maxBitrate,
      );
    });

    test('equality includes the bitrate', () {
      expect(
        const ScreenShareConfig(maxBitrateKbps: 6000) ==
            const ScreenShareConfig(maxBitrateKbps: 6000),
        isTrue,
      );
      expect(
        const ScreenShareConfig(maxBitrateKbps: 6000) ==
            const ScreenShareConfig(maxBitrateKbps: 7000),
        isFalse,
      );
    });
  });
}
