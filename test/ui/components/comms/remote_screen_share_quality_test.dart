import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_models.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/profile_picture_service.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/comms/comms_user_card.dart';
import 'package:novyse/ui/components/comms/remote_screen_share_quality_menu.dart';
import 'package:novyse/ui/components/huge_icon.dart';

void main() {
  group('RemoteQualityOption.resolveOptions', () {
    testWidgets('resolves real resolutions and never generic low/medium/high', (
      tester,
    ) async {
      late AppLocalizations l10n;
      await tester.pumpWidget(
        MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          locale: const Locale('it'),
          home: Builder(
            builder: (context) {
              l10n = AppLocalizations.of(context)!;
              return const SizedBox();
            },
          ),
        ),
      );

      final options = RemoteQualityOption.resolveOptions(
        pub: null,
        l10n: l10n,
      );

      // Verify that options include Automatica and real resolutions (1080p, 720p, 480p)
      final labels = options.map((o) => o.label).toList();
      expect(labels, contains('Automatica'));
      expect(labels, contains('1080p'));
      expect(labels, contains('720p'));
      expect(labels, contains('480p'));

      // Crucial: generic words like Low, Medium, High / Bassa, Media, Alta must NOT appear
      for (final label in labels) {
        expect(label.toLowerCase(), isNot(equals('low')));
        expect(label.toLowerCase(), isNot(equals('medium')));
        expect(label.toLowerCase(), isNot(equals('high')));
        expect(label.toLowerCase(), isNot(equals('bassa')));
        expect(label.toLowerCase(), isNot(equals('media')));
        expect(label.toLowerCase(), isNot(equals('alta')));
      }
    });

    test('formatResolution returns standard resolution formats with WebRTC tolerance', () {
      expect(RemoteQualityOption.formatResolution(2160), '4K (2160p)');
      expect(RemoteQualityOption.formatResolution(1440), '2K (1440p)');
      expect(RemoteQualityOption.formatResolution(1439), '2K (1440p)');
      expect(RemoteQualityOption.formatResolution(1080), '1080p');
      expect(RemoteQualityOption.formatResolution(1079), '1080p');
      expect(RemoteQualityOption.formatResolution(720), '720p');
      expect(RemoteQualityOption.formatResolution(719), '720p');
      expect(RemoteQualityOption.formatResolution(480), '480p');
      expect(RemoteQualityOption.formatResolution(479), '480p');
      expect(RemoteQualityOption.formatResolution(360), '360p');
      expect(RemoteQualityOption.formatResolution(359), '360p');
      expect(RemoteQualityOption.formatResolution(240), '240p');
      expect(RemoteQualityOption.formatResolution(239), '240p');
      expect(RemoteQualityOption.formatResolution(900), '900p');
    });
  });

  group('CommsController remote screen share quality', () {
    test('updates remoteScreenShareQualities in state', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final controller = container.read(commsProvider.notifier);
      expect(container.read(commsProvider).remoteScreenShareQualities, isEmpty);

      await controller.setRemoteScreenShareQuality('track-123', 'medium');
      expect(
        container.read(commsProvider).remoteScreenShareQualities['track-123'],
        'medium',
      );

      await controller.setRemoteScreenShareQuality('track-123', 'auto');
      expect(
        container.read(commsProvider).remoteScreenShareQualities['track-123'],
        'auto',
      );
    });
  });

  group('CommsUserCard quality button on screen share tiles', () {
    final avatarOverrides = <Override>[
      profilePictureUriProvider.overrideWith((ref, uuid) async => null),
      userProvider('u1').overrideWithValue(
        const UserModel(
          uuid: 'u1',
          name: 'Alice',
          surname: 'Smith',
        ),
      ),
    ];

    CommsTileItem createTile({
      required bool isScreenShare,
      required bool isLocal,
      String? trackSid,
    }) =>
        CommsTileItem(
          id: 'tile-1',
          userUUID: 'u1',
          isScreenShare: isScreenShare,
          isLocal: isLocal,
          trackSid: trackSid ?? (isScreenShare ? 'track-share-1' : null),
        );

    Future<AppLocalizations> pumpCard(
      WidgetTester tester, {
      required CommsTileItem tile,
      ProviderContainer? customContainer,
    }) async {
      late AppLocalizations l10n;
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: customContainer ??
              ProviderContainer(overrides: avatarOverrides),
          child: MaterialApp(
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            locale: const Locale('it'),
            home: Scaffold(
              body: SizedBox(
                width: 400,
                height: 300,
                child: Builder(
                  builder: (context) {
                    l10n = AppLocalizations.of(context)!;
                    return CommsUserCard(
                      tile: tile,
                      isPinned: false,
                      isFullScreen: false,
                      onPin: () {},
                      onFullScreen: () {},
                    );
                  },
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      return l10n;
    }

    testWidgets(
      'remote screen share displays the quality sliders button with tooltip',
      (tester) async {
        final l10n = await pumpCard(
          tester,
          tile: createTile(isScreenShare: true, isLocal: false),
        );

        // Hover over the card to reveal overlay controls
        final gesture = await tester.createGesture(
          kind: PointerDeviceKind.mouse,
        );
        await gesture.addPointer(location: Offset.zero);
        await gesture.moveTo(tester.getCenter(find.byType(CommsUserCard)));
        await tester.pumpAndSettle();

        // Sliders icon button should exist with correct tooltip
        final slidersIcon = find.byWidgetPredicate(
          (w) =>
              w is AppHugeIcon &&
              w.icon == HugeIcons.strokeRoundedSlidersVertical,
        );
        expect(slidersIcon, findsOneWidget);

        final btnWithTooltip = find.byTooltip(l10n.screenShareQualityTooltip);
        expect(btnWithTooltip, findsOneWidget);
      },
    );

    testWidgets(
      'local screen share does NOT display the quality sliders button',
      (tester) async {
        await pumpCard(
          tester,
          tile: createTile(isScreenShare: true, isLocal: true),
        );

        final gesture = await tester.createGesture(
          kind: PointerDeviceKind.mouse,
        );
        await gesture.addPointer(location: Offset.zero);
        await gesture.moveTo(tester.getCenter(find.byType(CommsUserCard)));
        await tester.pumpAndSettle();

        final slidersIcon = find.byWidgetPredicate(
          (w) =>
              w is AppHugeIcon &&
              w.icon == HugeIcons.strokeRoundedSlidersVertical,
        );
        expect(slidersIcon, findsNothing);
      },
    );

    testWidgets(
      'camera tile does NOT display the quality sliders button',
      (tester) async {
        await pumpCard(
          tester,
          tile: createTile(isScreenShare: false, isLocal: false),
        );

        final gesture = await tester.createGesture(
          kind: PointerDeviceKind.mouse,
        );
        await gesture.addPointer(location: Offset.zero);
        await gesture.moveTo(tester.getCenter(find.byType(CommsUserCard)));
        await tester.pumpAndSettle();

        final slidersIcon = find.byWidgetPredicate(
          (w) =>
              w is AppHugeIcon &&
              w.icon == HugeIcons.strokeRoundedSlidersVertical,
        );
        expect(slidersIcon, findsNothing);
      },
    );

    testWidgets(
      'tapping quality sliders button opens menu with Automatica and real resolutions',
      (tester) async {
        final container = ProviderContainer(overrides: avatarOverrides);
        addTearDown(container.dispose);

        final l10n = await pumpCard(
          tester,
          tile: createTile(
            isScreenShare: true,
            isLocal: false,
            trackSid: 'remote-share-abc',
          ),
          customContainer: container,
        );

        // Hover over the card to reveal controls
        final gesture = await tester.createGesture(
          kind: PointerDeviceKind.mouse,
        );
        await gesture.addPointer(location: Offset.zero);
        await gesture.moveTo(tester.getCenter(find.byType(CommsUserCard)));
        await tester.pumpAndSettle();

        // Tap the quality sliders button
        final btn = find.byTooltip(l10n.screenShareQualityTooltip);
        expect(btn, findsOneWidget);
        await tester.tap(btn);
        await tester.pumpAndSettle();

        // Menu should display title and real resolutions
        expect(find.text(l10n.screenShareQualityTitle), findsOneWidget);
        expect(find.text(l10n.screenShareQualityAuto), findsOneWidget);
        expect(find.text('1080p'), findsOneWidget);
        expect(find.text('720p'), findsOneWidget);
        expect(find.text('480p'), findsOneWidget);

        // Tap '720p' (medium)
        await tester.tap(find.text('720p'));
        await tester.pumpAndSettle();

        // Verify quality state was updated in controller
        expect(
          container
              .read(commsProvider)
              .remoteScreenShareQualities['remote-share-abc'],
          'medium',
        );
      },
    );
  });
}
