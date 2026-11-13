import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/plugins/bridge/app_sdk_js.dart';
import 'package:novyse/core/plugins/models/frame_origins.dart';
import 'package:novyse/core/plugins/plugin_build.dart';

void main() {
  group('prepareDocument', () {
    const html =
        '<html><head data-x="1"><title>x</title></head><body></body>'
        '</html>';

    test('injects the policy and the SDK after the head', () {
      final prepared = prepareDocument(
        html,
        frameOrigins: FrameOrigins.from(<String>['https://example.com']),
      );

      expect(prepared, contains('<meta http-equiv="Content-Security-Policy"'));
      expect(prepared, contains('frame-src https://example.com'));
      expect(prepared, contains('__appSdkEmit'));
      expect(prepared, contains('<head data-x="1">'));
      expect(prepared.indexOf('<meta'), lessThan(prepared.indexOf('<title>')));
    });

    test('does not inject twice', () {
      final once = prepareDocument(html);

      expect(prepareDocument(once), once);
    });

    test('prepends the injection when the document has no head', () {
      final prepared = prepareDocument('<html><body>x</body></html>');

      expect(
        prepared.startsWith('<meta http-equiv="Content-Security-Policy"'),
        isTrue,
      );
    });
  });

  group('pluginContentSecurityPolicy', () {
    test('the native policy does not allow eval', () {
      final policy = pluginContentSecurityPolicy("'none'");

      expect(policy, contains("frame-src 'none'"));
      expect(policy, isNot(contains("'unsafe-eval'")));
    });

    test('the web policy allows eval', () {
      final policy = pluginContentSecurityPolicy("'none'", allowEval: true);

      expect(policy, contains("'unsafe-eval'"));
    });
  });
}
