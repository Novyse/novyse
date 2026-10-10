import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/storage/file/uri_resolver.dart';

/// `UriResolver` is the widget that turns a storage key, local path, network
/// URL or fileUUID into something a media player can consume. Everything below
/// the `FileDownloadService` call is pure branching on the ref shape, so the
/// cases that do not need a download are fully covered here.
void main() {
  /// Renders a [UriResolver] and returns the uri handed to the builder.
  Future<String?> pumpResolver(
    WidgetTester tester, {
    String? ref,
    String? fileUUID,
    String? name,
    String? mimeType,
    bool autoDownload = false,
    Widget? placeholder,
  }) async {
    String? resolved;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: UriResolver(
            ref: ref,
            fileUUID: fileUUID,
            name: name,
            mimeType: mimeType,
            autoDownload: autoDownload,
            placeholder: placeholder,
            builder: (context, uri) {
              resolved = uri;
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return resolved;
  }

  testWidgets('shows the placeholder while resolving', (tester) async {
    const placeholder = Text('loading');
    String? resolved;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: UriResolver(
            ref: 'file.png',
            autoDownload: false,
            placeholder: placeholder,
            builder: (context, uri) {
              resolved = uri;
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('loading'), findsOneWidget);
    expect(resolved, isNull);

    await tester.pumpAndSettle();
  });

  testWidgets('resolves an https url as-is', (tester) async {
    expect(
      await pumpResolver(tester, ref: 'https://cdn.test/a.png'),
      'https://cdn.test/a.png',
    );
  });

  testWidgets('resolves an http url as-is', (tester) async {
    expect(
      await pumpResolver(tester, ref: 'http://cdn.test/a.png'),
      'http://cdn.test/a.png',
    );
  });

  testWidgets('resolves a blob url as-is', (tester) async {
    expect(
      await pumpResolver(tester, ref: 'blob:https://test/abc'),
      'blob:https://test/abc',
    );
  });

  testWidgets('resolves a data url as-is', (tester) async {
    expect(
      await pumpResolver(tester, ref: 'data:image/png;base64,AAAA'),
      'data:image/png;base64,AAAA',
    );
  });

  testWidgets('resolves a file:// path as-is', (tester) async {
    expect(
      await pumpResolver(tester, ref: 'file:///tmp/a.png'),
      'file:///tmp/a.png',
    );
  });

  testWidgets('resolves an absolute path as-is', (tester) async {
    expect(await pumpResolver(tester, ref: '/tmp/a.png'), '/tmp/a.png');
  });

  testWidgets('yields null when there is nothing to resolve', (tester) async {
    expect(await pumpResolver(tester), isNull);
  });

  testWidgets('yields null for an empty ref and an empty fileUUID', (
    tester,
  ) async {
    expect(await pumpResolver(tester, ref: '', fileUUID: ''), isNull);
  });

  testWidgets('falls back to null for an unknown storage key', (tester) async {
    // Nothing is cached under this key, and downloads are disabled, so the
    // resolver gives up rather than throwing.
    expect(
      await pumpResolver(
        tester,
        ref: 'definitely-missing-file.png',
        fileUUID: 'definitely-missing-uuid',
      ),
      isNull,
    );
  });

  testWidgets('re-resolves when the ref changes', (tester) async {
    final seen = <String?>[];

    Widget build(String ref) => MaterialApp(
      home: Scaffold(
        body: UriResolver(
          ref: ref,
          autoDownload: false,
          builder: (context, uri) {
            seen.add(uri);
            return const SizedBox.shrink();
          },
        ),
      ),
    );

    await tester.pumpWidget(build('https://cdn.test/a.png'));
    await tester.pumpAndSettle();
    await tester.pumpWidget(build('https://cdn.test/b.png'));
    await tester.pumpAndSettle();

    expect(seen, ['https://cdn.test/a.png', 'https://cdn.test/b.png']);
  });

  testWidgets('does not re-resolve when an unrelated prop changes', (
    tester,
  ) async {
    // Changing a prop the resolver does not key off (mimeType here) must not
    // change what the builder is handed.
    final seen = <String?>[];
    Widget record(BuildContext context, String? uri) {
      seen.add(uri);
      return const SizedBox.shrink();
    }

    Widget build(String mimeType) => MaterialApp(
      home: Scaffold(
        body: UriResolver(
          ref: 'https://cdn.test/a.png',
          mimeType: mimeType,
          autoDownload: false,
          builder: record,
        ),
      ),
    );

    await tester.pumpWidget(build('image/png'));
    await tester.pumpAndSettle();

    await tester.pumpWidget(build('image/jpeg'));
    await tester.pumpAndSettle();

    expect(seen, isNotEmpty);
    expect(seen.every((uri) => uri == 'https://cdn.test/a.png'), isTrue);
  });

  testWidgets('picks up a file that finishes downloading', (tester) async {
    String? resolved;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: UriResolver(
            fileUUID: 'uuid-1',
            autoDownload: true,
            builder: (context, uri) {
              resolved = uri;
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(resolved, isNull);

    GlobalEventEmitter.instance.emit('file:downloaded', {
      'fileUUID': 'uuid-1',
      'uri': 'file:///tmp/downloaded.png',
    });
    await tester.pumpAndSettle();

    expect(resolved, 'file:///tmp/downloaded.png');
  });

  testWidgets('ignores a download event for a different file', (tester) async {
    String? resolved;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: UriResolver(
            fileUUID: 'uuid-1',
            autoDownload: true,
            builder: (context, uri) {
              resolved = uri;
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    GlobalEventEmitter.instance.emit('file:downloaded', {
      'fileUUID': 'uuid-other',
      'uri': 'file:///tmp/other.png',
    });
    await tester.pumpAndSettle();

    expect(resolved, isNull);
  });

  testWidgets('ignores a malformed download event', (tester) async {
    String? resolved;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: UriResolver(
            fileUUID: 'uuid-1',
            autoDownload: true,
            builder: (context, uri) {
              resolved = uri;
              return const SizedBox.shrink();
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    GlobalEventEmitter.instance.emit('file:downloaded', 'not-a-map');
    await tester.pumpAndSettle();

    expect(resolved, isNull);
  });

  testWidgets('stops listening once disposed', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: UriResolver(
            fileUUID: 'uuid-1',
            autoDownload: true,
            builder: (context, uri) => const SizedBox.shrink(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Rebuild with a different tree so the resolver is unmounted.
    await tester.pumpWidget(const MaterialApp(home: Scaffold()));
    await tester.pumpAndSettle();

    // The listener is gone, so this must not throw a setState-after-dispose.
    GlobalEventEmitter.instance.emit('file:downloaded', {
      'fileUUID': 'uuid-1',
      'uri': 'file:///tmp/late.png',
    });
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });
}
