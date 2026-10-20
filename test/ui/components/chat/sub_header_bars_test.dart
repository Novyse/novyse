import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_state.dart';
import 'package:novyse/core/l10n/app_localizations.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_sub_header.dart';
import 'package:novyse/ui/components/chat/chat_detail/sub_header/comms/chat_comms_bar.dart';
import 'package:novyse/ui/components/chat/chat_detail/sub_header/comms/comms_bar_info.dart';
import 'package:novyse/ui/components/chat/chat_detail/sub_header/voice/chat_active_voice_bar.dart';
import 'package:novyse/ui/components/chat/chat_detail/sub_header/voice/voice_bar_meta.dart';
import 'package:novyse/ui/components/chat/chat_detail/sub_header/voice/voice_bar_speed_control.dart';

Widget _wrap(Widget child, ProviderContainer container) {
  return UncontrolledProviderScope(
    container: container,
    child: MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      locale: const Locale('en'),
      home: Scaffold(body: child),
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    ChatAudioService.instance.resetForTesting();
  });

  group('ChatAudioService metadata', () {
    testWidgets('reset clears metadata and speed', (tester) async {
      final svc = ChatAudioService.instance;
      svc.setActiveItemForTesting(
        'f1',
        isPlaying: true,
        uri: 'https://example.com/a.ogg',
        chatUUID: 'chat-1',
        subID: 2,
        messageID: 42,
        senderUUID: 'u1',
        isVoice: true,
      );
      expect(svc.activeChatUUID, 'chat-1');
      expect(svc.activeSubID, 2);
      expect(svc.activeMessageID, 42);
      expect(svc.activeSenderUUID, 'u1');
      expect(svc.activeIsVoice, isTrue);

      svc.resetForTesting();
      expect(svc.activeId, isNull);
      expect(svc.activeChatUUID, isNull);
      expect(svc.activeSenderUUID, isNull);
      expect(svc.activeIsVoice, isFalse);
      expect(svc.speed, 1.0);
    });

    test('speed steps match the required discrete values', () {
      expect(
        ChatAudioService.speedSteps,
        [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 5.0],
      );
    });
  });

  group('VoiceBarSpeedControl.formatSpeed', () {
    testWidgets('formats values with x suffix', (tester) async {
      expect(VoiceBarSpeedControl.formatSpeed(1.0), '1x');
      expect(VoiceBarSpeedControl.formatSpeed(0.25), '0.25x');
      expect(VoiceBarSpeedControl.formatSpeed(1.5), '1.5x');
    });
  });

  group('Sub-header bars visibility', () {
    const chatUUID = 'chat-bars-1';

    testWidgets('ChatSubHeader shrinks when nothing is active', (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      container.read(chatListProvider.notifier).state = const ChatListState(
        chats: [ChatModel(uuid: chatUUID, name: 'C', pinnedMessages: [])],
      );

      await tester.pumpWidget(
        _wrap(const ChatSubHeader(chatUUID: chatUUID), container),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ChatCommsBar), findsNothing);
      expect(find.byType(ChatActiveVoiceBar), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('ChatCommsBar hidden when disconnected', (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        _wrap(const ChatCommsBar(), container),
      );
      await tester.pumpAndSettle();

      expect(find.byType(CommsBarInfo), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('ChatCommsBar shows chat name and participant count',
        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      container.read(chatListProvider.notifier).state = const ChatListState(
        chats: [ChatModel(uuid: chatUUID, name: 'Vocal Room')],
      );
      container.read(commsProvider.notifier).state = const CommsState(
        connected: true,
        currentChatUUID: chatUUID,
        currentSub: 0,
      );

      await tester.pumpWidget(
        _wrap(const ChatCommsBar(), container),
      );
      await tester.pumpAndSettle();

      expect(find.text('Vocal Room'), findsOneWidget);
      expect(find.text('1 participant'), findsOneWidget);
      expect(tester.takeException(), isNull);

      container.read(commsProvider.notifier).state = const CommsState();
    });

    testWidgets('ChatActiveVoiceBar hidden without active audio',
        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        _wrap(const ChatActiveVoiceBar(), container),
      );
      await tester.pumpAndSettle();

      expect(find.byType(VoiceBarMeta), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('ChatActiveVoiceBar shows sender and times', (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      container.read(userStoreProvider.notifier).state = const UserStoreState(
        users: {
          'u1': UserModel(uuid: 'u1', name: 'Marco'),
        },
      );
      container.read(chatListProvider.notifier).state = const ChatListState(
        chats: [ChatModel(uuid: 'other-chat', name: 'Other')],
      );
      ChatAudioService.instance.setActiveItemForTesting(
        'file-1',
        isPlaying: true,
        uri: 'https://example.com/v.ogg',
        position: const Duration(seconds: 75),
        duration: const Duration(seconds: 300),
        chatUUID: 'other-chat',
        subID: 0,
        messageID: 7,
        senderUUID: 'u1',
        isVoice: true,
      );

      await tester.pumpWidget(
        _wrap(
          const ChatActiveVoiceBar(currentChatUUID: chatUUID),
          container,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Marco'), findsOneWidget);
      expect(find.textContaining('1:15'), findsOneWidget);
      expect(find.textContaining('Other'), findsOneWidget);
      expect(find.text('1x'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
    testWidgets('speed chip opens attachment menu and picks speed',
        (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      ChatAudioService.instance.setActiveItemForTesting(
        'file-2',
        isPlaying: true,
        uri: 'https://example.com/v.ogg',
        position: const Duration(seconds: 10),
        duration: const Duration(seconds: 100),
      );

      await tester.pumpWidget(
        _wrap(const ChatActiveVoiceBar(), container),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('1x'));
      await tester.pumpAndSettle();

      expect(find.text('2x'), findsOneWidget);

      await tester.tap(find.text('2x'));
      await tester.pumpAndSettle();

      expect(ChatAudioService.instance.speed, 2.0);
      expect(tester.takeException(), isNull);
    });
  });
}
