import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/updater/manual_update_check.dart';

void main() {
  group('compareVersions', () {
    test('equal versions compare to zero', () {
      expect(compareVersions('1.3.0-20261013.0', '1.3.0-20261013.0'), 0);
      expect(compareVersions('1.3.0', '1.3.0'), 0);
    });

    test('older current version compares negative', () {
      expect(compareVersions('1.2.0-20261013.0', '1.3.0-20261013.0'), lessThan(0));
      expect(compareVersions('1.3.0-20261012.0', '1.3.0-20261013.0'), lessThan(0));
      expect(compareVersions('1.3.0', '1.3.1'), lessThan(0));
    });

    test('newer current version compares positive', () {
      expect(
        compareVersions('1.4.0-20261014.0', '1.3.0-20261013.0'),
        greaterThan(0),
      );
    });

    test('missing segments count as zero', () {
      expect(compareVersions('1.3', '1.3.0'), 0);
      expect(compareVersions('1.3.0', '1.3'), 0);
    });

    test('numeric (not lexicographic) segment comparison', () {
      expect(compareVersions('1.3.0-20261013.9', '1.3.0-20261013.10'), lessThan(0));
    });
  });
}
