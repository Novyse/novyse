import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/services/api/modules/system_module.dart';

import '../../../helpers/fake_http.dart';

void main() {
  group('SystemModule.getVersion', () {
    test('GETs /health without auth and parses the version', () async {
      final http = FakeHttp.replying(
        (_) => {'status': 'ok', 'version': '1.4.0-20261014.0'},
      );

      final res = await SystemModule(http.dio).getVersion();

      expect(http.only.path, '/health');
      expect(http.only.options.extra['skipAuth'], isTrue);
      expect(res.success, isTrue);
      expect(res.version, '1.4.0-20261014.0');
    });

    test('reports failure when the status is not ok', () async {
      final res = await SystemModule(
        FakeHttp.replying((_) => {'status': 'error'}).dio,
      ).getVersion();

      expect(res.success, isFalse);
      expect(res.version, isNull);
    });

    test('reports failure when the version is missing', () async {
      final res = await SystemModule(
        FakeHttp.replying((_) => {'status': 'ok'}).dio,
      ).getVersion();

      expect(res.success, isFalse);
      expect(res.version, isNull);
    });

    test('reports failure when offline', () async {
      final res = await SystemModule(FakeHttp.offline().dio).getVersion();

      expect(res.success, isFalse);
      expect(res.version, isNull);
    });
  });
}
