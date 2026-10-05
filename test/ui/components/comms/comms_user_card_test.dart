import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/profile_picture_service.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/comms/comms_user_card.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// `CommsUserCard` resolves the participant name through the `userProvider`
/// family, so the tests override individual family entries with ready-made
/// `UserModel`s instead of hitting SQLite.
List<Override> userOverrides(Map<String, UserModel> users) => [
  for (final entry in users.entries)
    userProvider(entry.key).overrideWithValue(entry.value),
];

void main() {
  // `CommsUserCard` always hands a non-null uuid to `Avatar`, which would then
  // hit SQLite through `profilePictureUriProvider`. Overriding the provider
  // keeps the avatar on its no-picture path deterministically.
  final avatarOverrides = <Override>[
    profilePictureUriProvider.overrideWith((ref, uuid) async => null),
  ];

  /// A participant tile; [videoTrack] stays null so the avatar fallback renders.
  CommsTileItem tile({
    String id = 't1',
    String userUUID = 'u1',
    bool isScreenShare = false,
    bool isLocal = false,
    bool isSpeaking = false,
  }) => CommsTileItem(
    id: id,
    userUUID: userUUID,
    isScreenShare: isScreenShare,
    isLocal: isLocal,
    isSpeaking: isSpeaking,
    trackSid: isScreenShare ? id : null,
  );

  /// Pumps the card with a stubbed user store and returns the l10n strings.
  Future<AppLocalizations> pump(
    WidgetTester tester, {
    required CommsTileItem item,
    Map<String, UserModel> users = const {},
    bool isPinned = false,
    bool isFullScreen = false,
    VoidCallback? onStopShare,
    VoidCallback? onPin,
    VoidCallback? onFullScreen,
  }) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [...avatarOverrides, ...userOverrides(users)],
        child: MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: SizedBox(
              width: 300,
              height: 200,
              child: CommsUserCard(
                tile: item,
                isPinned: isPinned,
                isFullScreen: isFullScreen,
                onPin: onPin ?? () {},
                onFullScreen: onFullScreen ?? () {},
                onStopShare: onStopShare,
              ),
            ),
          ),
        ),
      ),
    );
    // The avatar fallback resolves its picture asynchronously.
    await tester.pumpAndSettle();
    return AppLocalizations.of(tester.element(find.byType(CommsUserCard)))!;
  }

  group('name label', () {
    testWidgets('shows the display name from the store', (tester) async {
      await pump(
        tester,
        item: tile(),
        users: {'u1': const UserModel(uuid: 'u1', name: 'Ada', surname: 'L')},
      );

      expect(find.text('Ada L'), findsOneWidget);
    });

    testWidgets('falls back to the generic user label', (tester) async {
      final l10n = await pump(tester, item: tile());

      expect(find.text(l10n.user), findsOneWidget);
    });

    testWidgets('marks the local participant as you', (tester) async {
      final l10n = await pump(tester, item: tile(isLocal: true));

      expect(find.text(l10n.commsUserYou(l10n.chatYou)), findsOneWidget);
    });

    testWidgets('marks a local screen share as such', (tester) async {
      final l10n = await pump(
        tester,
        item: tile(isLocal: true, isScreenShare: true),
      );

      expect(
        find.text(l10n.commsUserScreenShare(l10n.chatYou)),
        findsOneWidget,
      );
    });

    testWidgets('marks a remote screen share as such', (tester) async {
      final l10n = await pump(tester, item: tile(isScreenShare: true));

      expect(find.text(l10n.commsUserScreenShare(l10n.user)), findsOneWidget);
      expect(find.byIcon(Icons.screen_share_rounded), findsOneWidget);
    });

    testWidgets('shows a remote participant name unchanged', (tester) async {
      final l10n = await pump(tester, item: tile(isLocal: false));

      expect(find.text(l10n.user), findsOneWidget);
    });
  });

  group('controls', () {
    testWidgets('offers pin and fullscreen when not fullscreen', (
      tester,
    ) async {
      final l10n = await pump(tester, item: tile());

      expect(find.byTooltip(l10n.commsPin), findsOneWidget);
      expect(find.byTooltip(l10n.commsFullScreen), findsOneWidget);
    });

    testWidgets('offers unpin when already pinned', (tester) async {
      final l10n = await pump(tester, item: tile(), isPinned: true);

      expect(find.byTooltip(l10n.commsUnpin), findsOneWidget);
    });

    testWidgets('hides the pin button in fullscreen and offers exit instead', (
      tester,
    ) async {
      final l10n = await pump(tester, item: tile(), isFullScreen: true);

      expect(find.byTooltip(l10n.commsPin), findsNothing);
      expect(find.byTooltip(l10n.commsFullScreen), findsNothing);
      expect(find.byTooltip(l10n.commsExitFullScreen), findsOneWidget);
    });

    testWidgets('the pin button calls onPin', (tester) async {
      var pinned = 0;
      final l10n = await pump(tester, item: tile(), onPin: () => pinned++);

      await tester.tap(find.byTooltip(l10n.commsPin));
      await tester.pump();

      expect(pinned, 1);
    });

    testWidgets('the fullscreen button calls onFullScreen', (tester) async {
      var toggled = 0;
      final l10n = await pump(
        tester,
        item: tile(),
        onFullScreen: () => toggled++,
      );

      await tester.tap(find.byTooltip(l10n.commsFullScreen));
      await tester.pump();

      expect(toggled, 1);
    });

    testWidgets('no stop-share button for a remote share', (tester) async {
      final l10n = await pump(
        tester,
        item: tile(isScreenShare: true),
        onStopShare: () {},
      );

      expect(find.byTooltip(l10n.commsStopScreenShare), findsNothing);
    });

    testWidgets('no stop-share button when no handler is supplied', (
      tester,
    ) async {
      final l10n = await pump(
        tester,
        item: tile(isLocal: true, isScreenShare: true),
      );

      expect(find.byTooltip(l10n.commsStopScreenShare), findsNothing);
    });

    testWidgets('the stop-share button calls onStopShare for a local share', (
      tester,
    ) async {
      var stopped = 0;
      final l10n = await pump(
        tester,
        item: tile(isLocal: true, isScreenShare: true),
        onStopShare: () => stopped++,
      );

      await tester.tap(find.byTooltip(l10n.commsStopScreenShare));
      await tester.pump();

      expect(stopped, 1);
    });
  });

  group('control visibility', () {
    /// The opacity applied to the control cluster.
    double controlOpacity(WidgetTester tester) => tester
        .widgetList<AnimatedOpacity>(find.byType(AnimatedOpacity))
        .first
        .opacity;

    testWidgets('hidden until hovered or pinned', (tester) async {
      await pump(tester, item: tile());

      expect(controlOpacity(tester), 0.0);
    });

    testWidgets('visible while pinned', (tester) async {
      await pump(tester, item: tile(), isPinned: true);

      expect(controlOpacity(tester), 1.0);
    });

    testWidgets('visible after a hover', (tester) async {
      await pump(tester, item: tile());

      // `MouseRegion` only reacts to a mouse-kind pointer.
      final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(
        location: tester.getCenter(find.byType(CommsUserCard)),
      );
      await tester.pump();

      expect(controlOpacity(tester), 1.0);
      await mouse.removePointer();
    });

    testWidgets('hides again once the pointer leaves', (tester) async {
      // Not pinned: a pinned card keeps its controls up regardless of hover.
      await pump(tester, item: tile());

      final mouse = await tester.createGesture(kind: PointerDeviceKind.mouse);
      await mouse.addPointer(
        location: tester.getCenter(find.byType(CommsUserCard)),
      );
      await tester.pump();
      expect(controlOpacity(tester), 1.0);

      // The card fills the top-left 300x200 of the scaffold, so leave it by
      // moving to the far side of the body.
      await mouse.moveTo(const Offset(700, 500));
      await tester.pump();
      await tester.pumpAndSettle();

      expect(controlOpacity(tester), 0.0);
      await mouse.removePointer();
    });

    testWidgets('a pinned card keeps its controls up without a hover', (
      tester,
    ) async {
      await pump(tester, item: tile(), isPinned: true);

      expect(controlOpacity(tester), 1.0);
    });
  });

  group('fullscreen auto-hide', () {
    /// The opacity applied to the bottom name tag in fullscreen.
    double nameTagOpacity(WidgetTester tester) => tester
        .widgetList<AnimatedOpacity>(find.byType(AnimatedOpacity))
        .last
        .opacity;

    testWidgets('the overlay starts visible in fullscreen', (tester) async {
      await pump(tester, item: tile(), isFullScreen: true);

      expect(nameTagOpacity(tester), 1.0);
    });

    testWidgets('the overlay auto-hides after three seconds', (tester) async {
      await pump(tester, item: tile(), isFullScreen: true);

      await tester.pump(const Duration(seconds: 4));

      expect(nameTagOpacity(tester), 0.0);
    });

    testWidgets('tapping brings the overlay back', (tester) async {
      await pump(tester, item: tile(), isFullScreen: true);
      await tester.pump(const Duration(seconds: 4));
      expect(nameTagOpacity(tester), 0.0);

      await tester.tapAt(tester.getCenter(find.byType(CommsUserCard)));
      await tester.pump();

      expect(nameTagOpacity(tester), 1.0);
    });

    testWidgets('tapping hides the overlay again', (tester) async {
      await pump(tester, item: tile(), isFullScreen: true);

      await tester.tapAt(tester.getCenter(find.byType(CommsUserCard)));
      await tester.pump();

      expect(nameTagOpacity(tester), 0.0);
    });

    testWidgets('leaving fullscreen restores the overlay', (tester) async {
      await pump(tester, item: tile(), isFullScreen: true);
      await tester.pump(const Duration(seconds: 4));

      await tester.pumpWidget(
        ProviderScope(
          overrides: avatarOverrides,
          child: MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: Scaffold(
              body: SizedBox(
                width: 300,
                height: 200,
                child: CommsUserCard(
                  tile: tile(),
                  onPin: () {},
                  onFullScreen: () {},
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      // Outside fullscreen the name tag is always opaque.
      expect(nameTagOpacity(tester), 1.0);
    });
  });

  group('mute badges', () {
    Finder iconByType(List<List<dynamic>> icon) => find.byWidgetPredicate(
      (w) => w is AppHugeIcon && identical(w.icon, icon),
    );

    CommsTileItem muteTile({
      bool localMute = false,
      bool remoteMute = false,
      bool isLocal = false,
    }) => CommsTileItem(
      id: 't1',
      userUUID: 'u1',
      isLocal: isLocal,
      isRemoteMuted: remoteMute,
      isLocallyMuted: localMute,
    );

    testWidgets('no badge when the participant is unmuted', (tester) async {
      await pump(tester, item: muteTile());

      expect(iconByType(HugeIcons.strokeRoundedMicOff02), findsNothing);
    });

    testWidgets('local-only mute shows a plain mic-off with tooltip', (
      tester,
    ) async {
      final l10n = await pump(tester, item: muteTile(localMute: true));

      expect(iconByType(HugeIcons.strokeRoundedMicOff02), findsOneWidget);
      expect(find.byTooltip(l10n.commsUnmuteUser), findsOneWidget);
    });

    testWidgets('plain mic-off for a remote self-mute (bottombar)', (
      tester,
    ) async {
      final l10n = await pump(tester, item: muteTile(remoteMute: true));

      expect(iconByType(HugeIcons.strokeRoundedMicOff02), findsOneWidget);
      expect(find.byTooltip(l10n.commsUnmuteUser), findsNothing);
    });

    testWidgets('local mute wins when both mutes are active', (tester) async {
      final l10n = await pump(
        tester,
        item: muteTile(localMute: true, remoteMute: true),
      );

      // A single badge is shown, with the local-mute tooltip.
      expect(iconByType(HugeIcons.strokeRoundedMicOff02), findsOneWidget);
      expect(find.byTooltip(l10n.commsUnmuteUser), findsOneWidget);
    });

    testWidgets('no menu buttons on the card', (tester) async {
      await pump(tester, item: muteTile());

      expect(
        find.byWidgetPredicate(
          (w) =>
              w is AppHugeIcon &&
              identical(w.icon, HugeIcons.strokeRoundedMoreVertical),
        ),
        findsNothing,
      );
    });

    testWidgets('right-click opens the anchored menu', (tester) async {
      final l10n = await pump(tester, item: muteTile());

      await tester.tap(
        find.byType(CommsUserCard),
        buttons: kSecondaryButton,
      );
      await tester.pump();

      expect(find.text(l10n.commsMuteUser), findsOneWidget);
      expect(find.byType(Slider), findsOneWidget);
    });

    testWidgets('double-tap opens the anchored menu', (tester) async {
      final l10n = await pump(tester, item: muteTile());

      final card = find.byType(CommsUserCard);
      await tester.tap(card);
      await tester.pump(const Duration(milliseconds: 50));
      await tester.tap(card);
      await tester.pump();

      expect(find.text(l10n.commsMuteUser), findsOneWidget);
    });

    testWidgets('menu row icons are left-aligned', (tester) async {
      final l10n = await pump(tester, item: muteTile());

      await tester.tap(
        find.byType(CommsUserCard),
        buttons: kSecondaryButton,
      );
      await tester.pump();

      double leftEdge(List<List<dynamic>> icon) {
        final finder = find.byWidgetPredicate(
          (w) => w is AppHugeIcon && identical(w.icon, icon),
        );
        expect(finder, findsOneWidget);
        return tester.getTopLeft(finder).dx;
      }

      final muteDx = leftEdge(HugeIcons.strokeRoundedMic02);
      final volumeDx = leftEdge(HugeIcons.strokeRoundedVolumeHigh);
      final headerDx = leftEdge(HugeIcons.strokeRoundedUser);
      expect((muteDx - volumeDx).abs(), lessThanOrEqualTo(1.0));
      expect((muteDx - headerDx).abs(), lessThanOrEqualTo(1.0));

      double textLeft(String text) {
        final finder = find.text(text);
        expect(finder, findsOneWidget);
        return tester.getTopLeft(finder).dx;
      }

      final muteTextDx = textLeft(l10n.commsMuteUser);
      final volumeTextDx = textLeft(l10n.commsVolume);
      expect((muteTextDx - volumeTextDx).abs(), lessThanOrEqualTo(1.0));
    });

    testWidgets('pin from the menu calls onPin and closes it', (tester) async {
      var pinned = 0;
      final l10n = await pump(
        tester,
        item: muteTile(),
        onPin: () => pinned++,
      );

      await tester.tap(
        find.byType(CommsUserCard),
        buttons: kSecondaryButton,
      );
      await tester.pump();
      expect(find.text(l10n.commsMuteUser), findsOneWidget);

      await tester.tap(find.text(l10n.commsPin));
      await tester.pump();

      expect(pinned, 1);
      expect(find.text(l10n.commsMuteUser), findsNothing);
    });
  });

  group('speaking indicator', () {
    /// Reads the border colour of the animated container.
    Color borderColor(WidgetTester tester) =>
        (tester
                    .widget<AnimatedContainer>(find.byType(AnimatedContainer))
                    .decoration!
                as BoxDecoration)
            .border!
            .top
            .color;

    testWidgets('a silent participant uses the outline colour', (tester) async {
      await pump(tester, item: tile(isSpeaking: false));

      expect(borderColor(tester).a, lessThan(1));
    });

    testWidgets('a speaking participant gets the accent border', (
      tester,
    ) async {
      await pump(tester, item: tile(isSpeaking: true));

      expect(borderColor(tester).a, 1.0);
    });

    testWidgets('a screen share never counts as speaking', (tester) async {
      await pump(tester, item: tile(isSpeaking: true, isScreenShare: true));

      expect(borderColor(tester).a, lessThan(1));
    });
  });
}
