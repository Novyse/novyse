import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/plugins/plugin_cache.dart';
import 'package:path/path.dart' as p;

void main() {
  test('clear deletes builds but keeps the SDK marker', () async {
    final root = await Directory.systemTemp.createTemp('novyse-plugin-cache-');

    addTearDown(() async {
      if (root.existsSync()) await root.delete(recursive: true);
    });

    final marker = File(p.join(root.path, PluginCache.sdkMarker))
      ..writeAsStringSync('digest');

    final build = Directory(p.join(root.path, 'demo', '1.0.0'));
    build.createSync(recursive: true);
    File(p.join(build.path, 'index.html')).writeAsStringSync('<html></html>');

    await PluginCache.forTesting(root).clear();

    expect(marker.existsSync(), isTrue);
    expect(marker.readAsStringSync(), 'digest');
    expect(build.existsSync(), isFalse);
  });
}
