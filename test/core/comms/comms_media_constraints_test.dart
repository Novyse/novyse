import 'package:flutter_test/flutter_test.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/comms/devices/comms_media_constraints.dart';
import 'package:novyse/core/settings/settings_catalog.dart';

void main() {
  group('CommsMediaConstraints free-tier defaults', () {
    test('noise suppression + echo cancellation default to on', () {
      expect(CommsMediaConstraints.defaultNoiseSuppression, isTrue);
      expect(CommsMediaConstraints.defaultEchoCancellation, isTrue);
    });

    test('video defaults to max free-tier quality (1080p60)', () {
      expect(CommsMediaConstraints.defaultVideoQuality, '1080p');
      expect(CommsMediaConstraints.defaultVideoFramerate, '60');
    });

    test('screen share defaults to fluid 1080p60', () {
      expect(CommsMediaConstraints.defaultShareMode, 'fluid_60');
      final fluid = CommsMediaConstraints.resolveShareParamsFrom({
        'comms.shareQuality': 'fluid_60',
      });
      expect(fluid, CommsMediaConstraints.share1080p60);
      expect(
        CommsMediaConstraints.resolveShareMaxFrameRateFrom({
          'comms.shareQuality': 'fluid_60',
        }),
        60.0,
      );
    });
  });

  group('CommsMediaConstraints audio capture', () {
    test('maps the settings JSON to native WebRTC constraints', () {
      final on = CommsMediaConstraints.audioCapture(
        deviceId: 'mic-1',
        noiseSuppression: true,
        echoCancellation: true,
      );
      expect(on.deviceId, 'mic-1');
      expect(on.noiseSuppression, isTrue);
      expect(on.echoCancellation, isTrue);
      // Max-quality helpers stay on; custom DSP (typing filter) stays off.
      expect(on.autoGainControl, isTrue);
      expect(on.highPassFilter, isTrue);
      expect(on.voiceIsolation, isTrue);
      expect(on.typingNoiseDetection, isFalse);

      final off = CommsMediaConstraints.audioCapture(
        deviceId: null,
        noiseSuppression: false,
        echoCancellation: false,
      );
      expect(off.noiseSuppression, isFalse);
      expect(off.echoCancellation, isFalse);
      expect(off.voiceIsolation, isFalse);
      expect(off.autoGainControl, isTrue);
    });

    test('voice publish encoding is maximum quality stereo', () {
      const publish = CommsMediaConstraints.maxQualityAudioPublish;
      expect(
        publish.encoding,
        AudioEncoding.presetMusicHighQualityStereo,
      );
      expect(publish.dtx, isTrue);
    });
  });

  group('CommsMediaConstraints video clamping', () {
    test('low + high qualities and extended fps pass through', () {
      for (final q in ['240p', '360p', '480p', '720p', '1080p', '2k']) {
        expect(CommsMediaConstraints.resolveVideoQuality(q), q, reason: q);
      }
      expect(CommsMediaConstraints.resolveVideoFps('720p', '5'), 5);
      expect(CommsMediaConstraints.resolveVideoFps('720p', '15'), 15);
      expect(CommsMediaConstraints.resolveVideoFps('720p', '24'), 24);
      expect(CommsMediaConstraints.resolveVideoFps('1080p', '30'), 30);
      expect(CommsMediaConstraints.resolveVideoFps('1080p', '60'), 60);
      expect(CommsMediaConstraints.resolveVideoFps('1080p', '120'), 120);
      expect(
        CommsMediaConstraints.resolveVideoParams('1080p', '60'),
        CommsMediaConstraints.video1080p60,
      );
      // Low-quality preset carries matching dimensions + fps.
      final p360 = CommsMediaConstraints.resolveVideoParams('360p', '24');
      expect(p360.dimensions, VideoDimensionsPresets.h360_169);
      expect(p360.encoding?.maxFramerate, 24);
    });

    test('4K clamps to 2k and freeTierMaxBitrate is 4 Mbps', () {
      expect(CommsMediaConstraints.resolveVideoQuality('4k'), '2k');
      expect(CommsMediaConstraints.resolveVideoFps('4k', '60'), 60);
      expect(CommsMediaConstraints.freeTierMaxBitrate, 4000 * 1000);
      expect(CommsMediaConstraints.bitrateFor('1080p', 30), 4000 * 1000);
    });

    test('unknown stored values fall back to 1080p60', () {
      expect(CommsMediaConstraints.resolveVideoQuality('nope'), '1080p');
      expect(CommsMediaConstraints.resolveVideoFps('nope', 'nope'), 60);
    });

    test('camera options carry params + maxFrameRate', () {
      final opts = CommsMediaConstraints.cameraCapture(
        deviceId: 'cam-1',
        qualityId: '720p',
        fpsId: '60',
      );
      expect(opts.deviceId, 'cam-1');
      expect(opts.maxFrameRate, 60.0);
      expect(opts.params, CommsMediaConstraints.video720p60);
    });
  });

  group('CommsMediaConstraints screen share', () {
    test('clarity is 1080p5 coding mode, fluid is 1080p60', () {
      final clarity = CommsMediaConstraints.resolveShareParamsFrom({
        'comms.shareQuality': 'clarity',
      });
      expect(clarity, CommsMediaConstraints.share1080p5);
      expect(
        CommsMediaConstraints.resolveShareMaxFrameRateFrom({
          'comms.shareQuality': 'clarity',
        }),
        5.0,
      );
      final fluid = CommsMediaConstraints.resolveShareParamsFrom({
        'comms.shareQuality': 'fluid_60',
      });
      expect(fluid, CommsMediaConstraints.share1080p60);
      expect(
        CommsMediaConstraints.resolveShareMaxFrameRateFrom({
          'comms.shareQuality': 'fluid_60',
        }),
        60.0,
      );
    });

    test('custom combines quality + fps from settings', () {
      final custom = CommsMediaConstraints.resolveShareParamsFrom({
        'comms.shareQuality': 'custom',
        'comms.shareCustomQuality': '480p',
        'comms.shareCustomFps': '15',
      });
      expect(custom.dimensions, const VideoDimensions(854, 480));
      expect(custom.encoding?.maxFramerate, 15);
      expect(
        CommsMediaConstraints.resolveShareMaxFrameRateFrom({
          'comms.shareQuality': 'custom',
          'comms.shareCustomFps': '120',
        }),
        120.0,
      );
    });

    test('custom clamps 4k to 2k, unknown mode falls back to fluid', () {
      final clamped = CommsMediaConstraints.resolveShareParamsFrom({
        'comms.shareQuality': 'custom',
        'comms.shareCustomQuality': '4k',
        'comms.shareCustomFps': '60',
      });
      expect(clamped.dimensions, VideoDimensionsPresets.h1440_169);
      expect(
        CommsMediaConstraints.resolveShareMode('nope'),
        'fluid_60',
      );
    });

    test('simulcast sub-layers cascade down to 240p with matching fps', () {
      // 480p -> medium 360p, low 240p
      final (med480, low480) = CommsMediaConstraints.simulcastSubLayersFor('480p');
      expect(med480, '360p');
      expect(low480, '240p');

      // 1080p -> medium 720p, low 480p
      final (med1080, low1080) = CommsMediaConstraints.simulcastSubLayersFor('1080p');
      expect(med1080, '720p');
      expect(low1080, '480p');

      // 2k -> medium 1080p, low 720p
      final (med2k, low2k) = CommsMediaConstraints.simulcastSubLayersFor('2k');
      expect(med2k, '1080p');
      expect(low2k, '720p');

      // shareSimulcastLayersFor propagates chosen fps to all sublayers
      final layers = CommsMediaConstraints.shareSimulcastLayersFor('1080p', 60);
      expect(layers.length, 2);
      expect(layers[0].dimensions, const VideoDimensions(854, 480)); // low
      expect(layers[0].encoding?.maxFramerate, 60);
      expect(layers[1].dimensions, VideoDimensionsPresets.h720_169); // med
      expect(layers[1].encoding?.maxFramerate, 60);

      // cameraSimulcastLayersFor propagates identically for webcam
      final camLayers = CommsMediaConstraints.cameraSimulcastLayersFor('1080p', 60);
      expect(camLayers.length, 2);
      expect(camLayers[0].dimensions, const VideoDimensions(854, 480));
      expect(camLayers[0].encoding?.maxFramerate, 60);
      expect(camLayers[1].dimensions, VideoDimensionsPresets.h720_169);
      expect(camLayers[1].encoding?.maxFramerate, 60);

      // cameraPublishFrom sets VP8, 1080p60 top encoding, and 2 sub-layers
      final camPub = CommsMediaConstraints.cameraPublishFrom({
        'comms.videoQuality': '1080p',
        'comms.videoFramerate': '60',
      });
      expect(camPub.simulcast, isTrue);
      expect(camPub.videoCodec, 'vp8');
      expect(camPub.videoEncoding?.maxFramerate, 60);
      expect(camPub.videoSimulcastLayers.length, 2);
    });
  });

  group('Comms settings catalog wiring', () {
    SettingItem item(String key) =>
        SettingsCatalog.findBySettingKey(key)!;

    test('only native DSP switches are enabled with on-by-default', () {
      final noise = item('comms.noiseSuppression');
      final echo = item('comms.echoCancellation');
      expect(noise.disabled, isFalse);
      expect(echo.disabled, isFalse);
      expect(noise.defaultValue, isTrue);
      expect(echo.defaultValue, isTrue);

      // Custom DSP stays WIP-disabled.
      for (final key in [
        'comms.expander',
        'comms.noiseGateDb',
        'comms.keystrokeAttenuation',
      ]) {
        expect(item(key).disabled, isTrue, reason: key);
      }
    });

    test('video offers low-to-high qualities + extended fps', () {
      final quality = item('comms.videoQuality');
      expect(quality.disabled, isFalse);
      expect(
        quality.options!.map((o) => o.value).toList(),
        ['480p', '720p', '1080p', '2k', '4k'],
      );
      expect(quality.defaultValue, '1080p');
      expect(quality.onOptionPicked, isNotNull);
      // 4K is a paid-plan value: visible but not selectable on the free tier.
      final fourK = quality.options!.last;
      expect(fourK.value, '4k');
      expect(fourK.disabled, isTrue);

      final fps = item('comms.videoFramerate');
      expect(fps.disabled, isFalse);
      expect(
        fps.options!.map((o) => o.value).toList(),
        ['5', '15', '24', '30', '60', '120'],
      );
      expect(fps.defaultValue, '60');
      expect(fps.onOptionPicked, isNotNull);

      // Virtual background stays WIP-disabled.
      expect(item('comms.virtualBackground').disabled, isTrue);
    });

    test('share mode offers fluid/clarity/custom + conditional rows', () {
      final share = item('comms.shareQuality');
      expect(share.disabled, isFalse);
      expect(share.defaultValue, 'fluid_60');
      expect(
        share.options!.map((o) => o.value).toList(),
        ['fluid_60', 'clarity', 'custom'],
      );
      expect(share.onOptionPicked, isNotNull);

      final customQuality = item('comms.shareCustomQuality');
      expect(customQuality.defaultValue, '1080p');
      expect(
        customQuality.options!.map((o) => o.value).toList(),
        ['480p', '720p', '1080p', '2k', '4k'],
      );
      expect(customQuality.visibleWhen?.settingKey, 'comms.shareQuality');
      expect(customQuality.visibleWhen?.equals, 'custom');

      final customFps = item('comms.shareCustomFps');
      expect(customFps.defaultValue, '60');
      expect(
        customFps.options!.map((o) => o.value).toList(),
        ['5', '15', '24', '30', '60', '120'],
      );
      expect(customFps.visibleWhen?.settingKey, 'comms.shareQuality');
      expect(customFps.visibleWhen?.equals, 'custom');

      final hifi = item('comms.hifiAudioPassthrough');
      expect(hifi.disabled, isFalse);
      expect(hifi.defaultValue, isTrue);
    });
  });
}
