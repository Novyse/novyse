import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/comms/comms_state.dart';
import 'package:novyse/core/l10n/app_localizations_en.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/profile_picture_service.dart';
import 'package:novyse/ui/components/comms/comms_members_layout.dart';
import 'package:novyse/ui/components/comms/comms_user_card.dart';

/// `CommsMembersLayout` is a responsive grid: it picks a column count from the
/// tile count and orientation, and it mirrors the comms state into an OS
/// fullscreen overlay. The notifier is stubbed so no LiveKit room is needed.
class _StubCommsNotifier extends CommsNotifier {
  _StubCommsNotifier(this.initial);

  final CommsState initial;
  final List<String> calls = <String>[];

  @override
  CommsState build() => initial;

  @override
  void togglePin(String streamId) {
    calls.add('togglePin($streamId)');
    state = state.copyWith(
      pinnedStreamId: () => state.pinnedStreamId == streamId ? null : streamId,
    );
  }

  @override
  void toggleFullscreen(String streamId) {
    calls.add('toggleFullscreen($streamId)');
    state = state.copyWith(fullscreenStreamId: () => streamId);
  }

  @override
  void exitFullscreen() {
    calls.add('exitFullscreen');
    state = state.copyWith(fullscreenStreamId: () => null);
  }

  @override
  Future<void> stopScreenShare([String? trackSid]) async {
    calls.add('stopScreenShare($trackSid)');
  }
}

void main() {
  // The test app runs in English, so compare against the English strings
  // directly rather than looking them up from a context.
  final en = AppLocalizationsEn();

  late _StubCommsNotifier notifier;

  // Every `CommsUserCard` renders an `Avatar` with a non-null uuid, which would
  // then hit SQLite. Overriding the provider keeps the avatar on its no-picture
  // path deterministically.
  final avatarOverrides = <Override>[
    profilePictureUriProvider.overrideWith((ref, uuid) async => null),
  ];

  /// A tile; a screen share is always local, since only the sharer can stop it.
  CommsTileItem tile(String id, {String? trackSid, bool isLocal = true}) =>
      CommsTileItem(
        id: id,
        userUUID: 'u-$id',
        trackSid: trackSid,
        isScreenShare: trackSid != null,
        isLocal: isLocal,
      );

  /// Pumps the layout with the given comms state and tile list.
  Future<void> pump(
    WidgetTester tester, {
    CommsState? state,
    required List<CommsTileItem> tiles,
    Size size = const Size(800, 600),
  }) async {
    notifier = _StubCommsNotifier(state ?? const CommsState());
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          ...avatarOverrides,
          commsProvider.overrideWith(() => notifier),
        ],
        child: MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: Center(
              child: SizedBox(
                width: size.width,
                height: size.height,
                child: CommsMembersLayout(tiles: tiles),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  group('empty state', () {
    testWidgets('shows the no-participants message with no tiles', (
      tester,
    ) async {
      await pump(tester, tiles: const []);

      expect(find.text(en.commsNoParticipants), findsOneWidget);
      expect(find.byType(CommsUserCard), findsNothing);
    });
  });

  group('grid', () {
    testWidgets('renders one card per tile', (tester) async {
      await pump(tester, tiles: [tile('a'), tile('b'), tile('c')]);

      expect(find.byType(CommsUserCard), findsNWidgets(3));
    });

    testWidgets('renders a single tile full width', (tester) async {
      await pump(tester, tiles: [tile('a')]);

      final card = tester.getSize(find.byType(CommsUserCard));
      // Clamped to the available width.
      expect(card.width, greaterThan(140));
    });

    testWidgets('lays two tiles out in a row when landscape', (tester) async {
      await pump(
        tester,
        tiles: [tile('a'), tile('b')],
        size: const Size(900, 400),
      );

      final a = tester.getTopLeft(find.byType(CommsUserCard).at(0));
      final b = tester.getTopLeft(find.byType(CommsUserCard).at(1));
      expect(a.dy, b.dy);
    });

    testWidgets('stacks two tiles in a column when portrait', (tester) async {
      await pump(
        tester,
        tiles: [tile('a'), tile('b')],
        size: const Size(400, 900),
      );

      final a = tester.getTopLeft(find.byType(CommsUserCard).at(0));
      final b = tester.getTopLeft(find.byType(CommsUserCard).at(1));
      expect(a.dx, b.dx);
      expect(a.dy, lessThan(b.dy));
    });

    testWidgets('a single tile stays centred in portrait', (tester) async {
      await pump(tester, tiles: [tile('a')], size: const Size(400, 900));

      expect(find.byType(CommsUserCard), findsOneWidget);
    });

    testWidgets('handles three to six tiles', (tester) async {
      for (final count in [3, 4, 5, 6]) {
        await pump(
          tester,
          tiles: [for (var i = 0; i < count; i++) tile('t$i')],
        );
        expect(
          find.byType(CommsUserCard),
          findsNWidgets(count),
          reason: '$count',
        );
      }
    });

    testWidgets('handles more than six tiles', (tester) async {
      await pump(tester, tiles: [for (var i = 0; i < 10; i++) tile('t$i')]);

      expect(find.byType(CommsUserCard), findsNWidgets(10));
    });

    testWidgets('scrolls when the tiles overflow', (tester) async {
      await pump(
        tester,
        tiles: [for (var i = 0; i < 9; i++) tile('t$i')],
        size: const Size(300, 300),
      );

      expect(find.byType(SingleChildScrollView), findsOneWidget);
    });
  });

  group('pinning', () {
    testWidgets('only the pinned tile remains when one is pinned', (
      tester,
    ) async {
      await pump(
        tester,
        state: const CommsState(pinnedStreamId: 'b'),
        tiles: [tile('a'), tile('b'), tile('c')],
      );

      expect(find.byType(CommsUserCard), findsOneWidget);
    });

    testWidgets('the pin button pins the tile', (tester) async {
      await pump(tester, tiles: [tile('a')]);

      await tester.tap(find.byTooltip(en.commsPin));
      await tester.pumpAndSettle();

      expect(notifier.calls, contains('togglePin(a)'));
    });
  });

  group('fullscreen', () {
    testWidgets('the fullscreen button requests it', (tester) async {
      await pump(tester, tiles: [tile('a')]);

      await tester.tap(find.byTooltip(en.commsFullScreen));
      await tester.pumpAndSettle();

      expect(notifier.calls, contains('toggleFullscreen(a)'));
    });

    testWidgets('a fullscreen tile replaces the grid with an overlay', (
      tester,
    ) async {
      await pump(
        tester,
        state: const CommsState(fullscreenStreamId: 'a'),
        tiles: [tile('a'), tile('b')],
      );

      // The overlay is opaque with `maintainState: false`, so the route behind
      // it is unmounted and only the fullscreen card remains.
      expect(find.byType(CommsMembersLayout), findsNothing);
      expect(find.byType(CommsUserCard), findsOneWidget);
    });

    testWidgets('an unknown fullscreen id clears itself', (tester) async {
      await pump(
        tester,
        state: const CommsState(fullscreenStreamId: 'gone'),
        tiles: [tile('a')],
      );

      expect(notifier.calls, contains('exitFullscreen'));
      // No overlay, so the grid is still on screen.
      expect(find.byType(CommsMembersLayout), findsOneWidget);
      expect(find.byType(CommsUserCard), findsOneWidget);
    });

    testWidgets('a fullscreen screen-share offers the stop button', (
      tester,
    ) async {
      await pump(
        tester,
        state: const CommsState(fullscreenStreamId: 'TR_1'),
        tiles: [
          tile('TR_1', trackSid: 'TR_1'),
          tile('a'),
        ],
      );

      expect(find.byTooltip(en.commsStopScreenShare), findsOneWidget);
    });

    testWidgets('the overlay card is marked as fullscreen', (tester) async {
      await pump(
        tester,
        state: const CommsState(fullscreenStreamId: 'a'),
        tiles: [tile('a')],
      );

      final card = tester.widget<CommsUserCard>(find.byType(CommsUserCard));
      expect(card.isFullScreen, isTrue);
    });

    testWidgets('leaving fullscreen removes the overlay', (tester) async {
      await pump(
        tester,
        state: const CommsState(fullscreenStreamId: 'a'),
        tiles: [tile('a')],
      );
      // Fullscreen: only the overlay card is mounted.
      expect(find.byType(CommsUserCard), findsOneWidget);

      notifier.exitFullscreen();
      await tester.pumpAndSettle();

      // Back to the grid.
      expect(find.byType(CommsMembersLayout), findsOneWidget);
      expect(find.byType(CommsUserCard), findsOneWidget);
    });

    testWidgets('leaving fullscreen with no overlay is harmless', (
      tester,
    ) async {
      await pump(tester, tiles: [tile('a')]);

      notifier.exitFullscreen();
      await tester.pumpAndSettle();

      expect(find.byType(CommsMembersLayout), findsOneWidget);
      expect(find.byType(CommsUserCard), findsOneWidget);
    });
  });

  group('stop sharing', () {
    testWidgets('a screen-share tile exposes the stop action', (tester) async {
      await pump(tester, tiles: [tile('TR_1', trackSid: 'TR_1')]);

      await tester.tap(find.byTooltip(en.commsStopScreenShare));
      await tester.pumpAndSettle();

      expect(notifier.calls, contains('stopScreenShare(TR_1)'));
    });

    testWidgets('a camera tile has no stop action', (tester) async {
      await pump(tester, tiles: [tile('a')]);

      expect(find.byTooltip(en.commsStopScreenShare), findsNothing);
    });
  });
}
