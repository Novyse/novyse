import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/plugins/models/activity_instance.dart';
import 'package:novyse/core/plugins/models/plugin_entry.dart';

void main() {
  group('PluginEntry', () {
    test('reads channels and frame origins from permissions', () {
      final entry = PluginEntry.fromJson({
        'slug': 'watch-together',
        'name': 'Watch Together',
        'version': '1.2.0',
        'permissions': {
          'channels': ['state'],
          'frame': ['https://www.youtube.com'],
        },
      });

      expect(entry.channels, <String>['state']);
      expect(entry.frameOrigins, <String>['https://www.youtube.com']);
      expect(entry.bundle.channels, <String>['state']);
      expect(entry.isCompatibleWith('1.0.0'), isTrue);
    });

    test('honours the minimum app version', () {
      final entry = PluginEntry.fromJson({'minAppVersion': '2.0.0'});

      expect(entry.isCompatibleWith('1.0.0'), isFalse);
      expect(entry.isCompatibleWith('2.0.0'), isTrue);
    });
  });

  group('PluginBundle', () {
    test('reads the top-level channels of the activity snapshot', () {
      final bundle = PluginBundle.fromJson({
        'downloadUrl': 'https://example.com/plugin.zip',
        'entryUrl': 'https://example.com/index.html',
        'channels': ['action', 'stream'],
      });

      expect(bundle.channels, <String>['action', 'stream']);
      expect(bundle.allowsChannel('action'), isTrue);
      expect(bundle.allowsChannel('state'), isFalse);
    });

    test('missing channels mean no write permission', () {
      final bundle = PluginBundle.fromJson({
        'downloadUrl': 'https://example.com/plugin.zip',
        'entryUrl': 'https://example.com/index.html',
      });

      expect(bundle.channels, isEmpty);
      expect(bundle.allowsChannel('state'), isFalse);
    });
  });

  group('ActivityInstance', () {
    test('keeps the channels of the pinned bundle', () {
      final instance = ActivityInstance.fromJson({
        'instanceId': 'instance-1',
        'slug': 'demo',
        'version': '1.0.0',
        'bundle': {
          'downloadUrl': 'https://example.com/plugin.zip',
          'entryUrl': 'https://example.com/index.html',
          'channels': ['stream'],
        },
      });

      expect(instance.bundle.allowsChannel('stream'), isTrue);
      expect(instance.bundle.allowsChannel('state'), isFalse);
    });
  });
}
