import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/services/api_gateway.dart';

void main() {
  test(
    'createDefaultDio creates Dio with required platform and version headers',
    () {
      final dio = createDefaultDio();

      expect(dio.options.headers['x-app-version'], equals(config.appVersion));
      expect(dio.options.headers['x-platform'], isNotNull);
      expect(dio.options.headers['x-operating-system'], isNotNull);
    },
  );

  test('Gateway() constructor injects default Dio with headers', () {
    final gw = Gateway();
    expect(gw.check, isNotNull);
  });
}
