import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/plugins/models/frame_origins.dart';

void main() {
  group('FrameOrigins', () {
    test('parses https hosts, ports and wildcards', () {
      final origins = FrameOrigins.from(<String>[
        'https://Example.com/',
        'https://example.com:8443',
        'https://*.Example.com',
        'https://example.com',
        'https://example.com:443',
      ]);

      expect(origins.values, <String>[
        'https://example.com',
        'https://example.com:8443',
        'https://*.example.com',
      ]);
    });

    test('drops invalid entries without dropping the plugin', () {
      final origins = FrameOrigins.from(<String>[
        'http://example.com',
        'https://example.com/path',
        'https://example.com?x=1',
        'https://example.com#x',
        'https://user:pass@example.com',
        'https://*.com',
        'https://example.com:0',
        'https://example.com:70000',
        'https://bad_host.example',
      ]);

      expect(origins.isEmpty, isTrue);
      expect(origins, FrameOrigins.none);
    });

    test('keeps at most the declared ceiling', () {
      final origins = FrameOrigins.from(<String>[
        for (var index = 0; index < 10; index++) 'https://host$index.example',
      ]);

      expect(origins.values, hasLength(FrameOrigins.maxEntries));
    });

    test('reads permissions.frame from a manifest', () {
      final origins = FrameOrigins.fromManifest({
        'permissions': {
          'frame': ['https://example.com'],
        },
      });

      expect(origins.values, <String>['https://example.com']);
      expect(FrameOrigins.fromManifest({}), FrameOrigins.none);
      expect(
        FrameOrigins.fromManifest({'permissions': 'not a map'}),
        FrameOrigins.none,
      );
    });

    test('allows exact hosts and wildcard subdomains only', () {
      final origins = FrameOrigins.from(<String>[
        'https://example.com',
        'https://*.example.org',
        'https://example.net:8443',
      ]);

      expect(origins.allows('https://example.com/video'), isTrue);
      expect(origins.allows('https://sub.example.org/video'), isTrue);
      expect(origins.allows('https://deep.sub.example.org/video'), isTrue);
      expect(origins.allows('https://example.org'), isFalse);
      expect(origins.allows('https://example.com.evil'), isFalse);
      expect(origins.allows('http://example.com'), isFalse);
      expect(origins.allows('https://example.net:8443/video'), isTrue);
      expect(origins.allows('https://example.net/video'), isFalse);
      expect(FrameOrigins.none.allows('https://example.com'), isFalse);
    });

    test('builds the frame-src list', () {
      expect(FrameOrigins.none.csp, "'none'");
      expect(
        FrameOrigins.from(<String>['https://example.com']).csp,
        'https://example.com',
      );
    });

    test('compares by declared origins', () {
      expect(
        FrameOrigins.from(<String>['https://example.com']),
        FrameOrigins.from(<String>['https://example.com']),
      );
      expect(
        FrameOrigins.from(<String>['https://example.com']).hashCode,
        FrameOrigins.from(<String>['https://example.com']).hashCode,
      );
    });
  });
}
