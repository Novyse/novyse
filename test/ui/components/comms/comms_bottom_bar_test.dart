import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_state.dart';
import 'package:novyse/core/l10n/app_localizations.dart';
import 'package:novyse/core/l10n/app_localizations_en.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/comms/comms_bottom_bar.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/status/status_message.dart';

/// `CommsBottomBar` renders either a join pill or the full control bar
/// depending on whether the comms state matches the chat it was given. The
/// notifier is overridden so no LiveKit connection is attempted.
class _StubCommsNotifier extends CommsNotifier {
  _StubCommsNotifier(this.initial);

  final CommsState initial;
  final List<String> calls = <String>[];

  @override
  CommsState build() => initial;

  @override
  Future<void> join(String chatUUID, {int sub = 0}) async {
    calls.add('join($chatUUID,$sub)');
  }

  @override
  Future<void> toggleAudio() async => calls.add('toggleAudio');

  @override
  Future<void> toggleVideo() async => calls.add('toggleVideo');

  @override
  void toggleAudioOutput() => calls.add('toggleAudioOutput');

  @override
  Future<void> leave() async => calls.add('leave');

  @override
  void clearError() => calls.add('clearError');
}

void main() {
  late _StubCommsNotifier notifier;

  /// Pumps the bar with the given comms state and returns the l10n strings.
  Future<AppLocalizations> pump(
    WidgetTester tester,
    CommsState state, {
    String chatUUID = 'chat-1',
    int sub = 0,
  }) async {
    notifier = _StubCommsNotifier(state);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [commsProvider.overrideWith(() => notifier)],
        child: MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: CommsBottomBar(chatUUID: chatUUID, sub: sub),
          ),
        ),
      ),
    );
    return AppLocalizations.of(tester.element(find.byType(CommsBottomBar)))!;
  }

  /// The tooltip of every icon button currently rendered.
  List<String?> tooltips(WidgetTester tester) => tester
      .widgetList<Tooltip>(find.byType(Tooltip))
      .map((t) => t.message)
      .toList();

  group('disconnected', () {
    testWidgets('shows the join button', (tester) async {
      final l10n = await pump(tester, const CommsState());

      expect(tooltips(tester), [l10n.commsJoinRoom]);
    });

    testWidgets('does not show the control bar', (tester) async {
      await pump(tester, const CommsState());

      // 5 control buttons + leave, none of which should be present yet.
      expect(find.byType(InkWell), findsOneWidget);
    });

    testWidgets('shows a spinner while connecting', (tester) async {
      await pump(
        tester,
        const CommsState(currentChatUUID: 'chat-1', connecting: true),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('still shows the join button when connected to another chat', (
      tester,
    ) async {
      final l10n = await pump(
        tester,
        const CommsState(connected: true, currentChatUUID: 'chat-OTHER'),
      );

      expect(tooltips(tester), [l10n.commsJoinRoom]);
    });

    testWidgets('still shows the join button when connected to another sub', (
      tester,
    ) async {
      final l10n = await pump(
        tester,
        const CommsState(
          connected: true,
          currentChatUUID: 'chat-1',
          currentSub: 3,
        ),
        sub: 2,
      );

      expect(tooltips(tester), [l10n.commsJoinRoom]);
    });

    testWidgets('pressing join calls the notifier with the chat and sub', (
      tester,
    ) async {
      await pump(tester, const CommsState(), chatUUID: 'chat-7', sub: 4);

      await tester.tap(find.byTooltip(AppLocalizationsEn().commsJoinRoom));
      await tester.pump();

      expect(notifier.calls, ['join(chat-7,4)']);
    });
  });

  group('connected', () {
    /// A state that matches the default `chat-1` / sub 0.
    const connected = CommsState(connected: true, currentChatUUID: 'chat-1');

    testWidgets('shows the six controls instead of the join button', (
      tester,
    ) async {
      final l10n = await pump(tester, connected);

      expect(tooltips(tester), [
        l10n.commsUnmuteMic,
        l10n.commsTurnOnCamera,
        l10n.commsDeafen,
        l10n.commsShareScreen,
        l10n.settings,
        l10n.commsLeaveRoom,
      ]);
    });

    testWidgets('reflects an enabled microphone', (tester) async {
      final l10n = await pump(
        tester,
        const CommsState(
          connected: true,
          currentChatUUID: 'chat-1',
          isAudioEnabled: true,
        ),
      );

      expect(tooltips(tester), contains(l10n.commsMuteMic));
      expect(tooltips(tester), isNot(contains(l10n.commsUnmuteMic)));
    });

    testWidgets('reflects an enabled camera', (tester) async {
      final l10n = await pump(
        tester,
        const CommsState(
          connected: true,
          currentChatUUID: 'chat-1',
          isVideoEnabled: true,
        ),
      );

      expect(tooltips(tester), contains(l10n.commsTurnOffCamera));
    });

    testWidgets('reflects a deafened speaker', (tester) async {
      final l10n = await pump(
        tester,
        const CommsState(
          connected: true,
          currentChatUUID: 'chat-1',
          isAudioOutputEnabled: false,
        ),
      );

      expect(tooltips(tester), contains(l10n.commsUndeafen));
    });

    testWidgets('the mic button toggles audio', (tester) async {
      final l10n = await pump(tester, connected);

      await tester.tap(find.byTooltip(l10n.commsUnmuteMic));
      await tester.pump();

      expect(notifier.calls, ['toggleAudio']);
    });

    testWidgets('the camera button toggles video', (tester) async {
      final l10n = await pump(tester, connected);

      await tester.tap(find.byTooltip(l10n.commsTurnOnCamera));
      await tester.pump();

      expect(notifier.calls, ['toggleVideo']);
    });

    testWidgets('the speaker button toggles the audio output', (tester) async {
      final l10n = await pump(tester, connected);

      await tester.tap(find.byTooltip(l10n.commsDeafen));
      await tester.pump();

      expect(notifier.calls, ['toggleAudioOutput']);
    });

    testWidgets('the leave button leaves the room', (tester) async {
      final l10n = await pump(tester, connected);

      await tester.tap(find.byTooltip(l10n.commsLeaveRoom));
      await tester.pump();

      expect(notifier.calls, ['leave']);
    });

    testWidgets('the settings button is a no-op', (tester) async {
      final l10n = await pump(tester, connected);

      await tester.tap(find.byTooltip(l10n.settings));
      await tester.pump();

      expect(notifier.calls, isEmpty);
    });
  });

  group('error banner', () {
    testWidgets('shows a plain error message when connected', (tester) async {
      final l10n = await pump(
        tester,
        const CommsState(
          connected: true,
          currentChatUUID: 'chat-1',
          errorMessage: 'room is full',
        ),
      );

      expect(find.text('room is full'), findsOneWidget);
      expect(tooltips(tester), contains(l10n.commsLeaveRoom));
    });

    testWidgets('shows a localized error builder when connected', (
      tester,
    ) async {
      await pump(
        tester,
        CommsState(
          connected: true,
          currentChatUUID: 'chat-1',
          errorMessageBuilder: (l10n) => 'localized failure',
        ),
      );

      expect(find.text('localized failure'), findsOneWidget);
    });

    testWidgets('shows the error while disconnected too', (tester) async {
      await pump(tester, const CommsState(errorMessage: 'connection lost'));

      expect(find.text('connection lost'), findsOneWidget);
    });

    testWidgets('closing the banner calls clearError', (tester) async {
      await pump(
        tester,
        const CommsState(
          connected: true,
          currentChatUUID: 'chat-1',
          errorMessage: 'room is full',
        ),
      );

      // `StatusMessage` renders the close affordance as the trailing InkWell
      // inside the banner.
      await tester.tap(
        find
            .descendant(
              of: find.byType(StatusMessage),
              matching: find.byType(InkWell),
            )
            .last,
      );
      await tester.pump();

      expect(notifier.calls, contains('clearError'));
      expect(find.text('room is full'), findsNothing);
    });

    testWidgets('no banner when there is no error', (tester) async {
      await pump(
        tester,
        const CommsState(connected: true, currentChatUUID: 'chat-1'),
      );

      expect(find.textContaining('room is full'), findsNothing);
    });
  });

  group('icons', () {
    testWidgets('renders the huge icons for every control', (tester) async {
      await pump(
        tester,
        const CommsState(connected: true, currentChatUUID: 'chat-1'),
      );

      expect(find.byType(AppHugeIcon), findsNWidgets(6));
    });
  });
}
