import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/comms/comms_state.dart';
import 'package:novyse/core/l10n/app_localizations.dart';
import 'package:novyse/ui/components/comms/screen_share_stream_switcher.dart';

class _StubCommsNotifier extends CommsNotifier {
  _StubCommsNotifier(this.initial);

  final CommsState initial;

  @override
  CommsState build() => initial;
}

const _shareA = CommsTileItem(
  id: 'sid-a',
  userUUID: 'u1',
  isScreenShare: true,
  trackSid: 'sid-a',
);
const _shareB = CommsTileItem(
  id: 'sid-b',
  userUUID: 'u2',
  isScreenShare: true,
  trackSid: 'sid-b',
);
const _camera = CommsTileItem(id: 'cam-1', userUUID: 'u3');

Widget _wrap(Widget child, ProviderContainer container) {
  return UncontrolledProviderScope(
    container: container,
    child: MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      locale: const Locale('en'),
      home: Scaffold(body: Stack(children: [child])),
    ),
  );
}

void main() {
  group('ScreenShareStreamSwitcher', () {
    testWidgets('hidden when no stream is pinned or fullscreen', (tester) async {
      final container = ProviderContainer(
        overrides: [
          commsProvider.overrideWith(
            () => _StubCommsNotifier(const CommsState()),
          ),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        _wrap(
          const ScreenShareStreamSwitcher(tiles: [_shareA, _shareB]),
          container,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('1/2'), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('hidden with a single screen share', (tester) async {
      final container = ProviderContainer(
        overrides: [
          commsProvider.overrideWith(
            () => _StubCommsNotifier(
              const CommsState(pinnedStreamId: 'sid-a'),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        _wrap(
          const ScreenShareStreamSwitcher(tiles: [_shareA, _camera]),
          container,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('1/2'), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('cycles pinned stream with the arrows', (tester) async {
      final container = ProviderContainer(
        overrides: [
          commsProvider.overrideWith(
            () => _StubCommsNotifier(
              const CommsState(pinnedStreamId: 'sid-a'),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        _wrap(
          const ScreenShareStreamSwitcher(tiles: [_shareA, _shareB]),
          container,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('1/2'), findsOneWidget);

      await tester.tap(find.byTooltip('Next screen share'));
      await tester.pumpAndSettle();

      expect(container.read(commsProvider).pinnedStreamId, 'sid-b');
      expect(find.text('2/2'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('cycles fullscreen stream with the arrows', (tester) async {
      final container = ProviderContainer(
        overrides: [
          commsProvider.overrideWith(
            () => _StubCommsNotifier(
              const CommsState(fullscreenStreamId: 'sid-a'),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        _wrap(
          const ScreenShareStreamSwitcher(tiles: [_shareA, _shareB]),
          container,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('1/2'), findsOneWidget);

      await tester.tap(find.byTooltip('Previous screen share'));
      await tester.pumpAndSettle();

      expect(container.read(commsProvider).fullscreenStreamId, 'sid-b');
      expect(find.text('2/2'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
