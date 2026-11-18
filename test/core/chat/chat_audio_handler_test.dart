import 'package:audio_service/audio_service.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/chat_audio_handler.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    for (final name in const [
      'xyz.luan/audioplayers',
      'xyz.luan/audioplayers.global',
    ]) {
      messenger.setMockMethodCallHandler(
        MethodChannel(name),
        (call) async => null,
      );
    }
  });

  late ChatAudioHandler handler;

  setUp(() {
    ChatAudioService.instance.resetForTesting();
    handler = ChatAudioHandler(ChatAudioService.instance);
  });

  tearDown(() {
    ChatAudioService.instance.resetForTesting();
  });

  test('publishes voice metadata and pause control while playing', () {
    ChatAudioService.instance.setActiveItemForTesting(
      'voice-1',
      isPlaying: true,
      position: const Duration(seconds: 2),
      duration: const Duration(seconds: 30),
      uri: 'https://example.com/voice.ogg',
      isVoice: true,
      title: 'Alice',
    );

    expect(handler.mediaItem.value?.title, 'Alice');
    expect(handler.mediaItem.value?.artist, 'Voice message');
    expect(handler.mediaItem.value?.duration, const Duration(seconds: 30));
    expect(handler.playbackState.value.playing, isTrue);
    expect(
      handler.playbackState.value.processingState,
      AudioProcessingState.ready,
    );
    expect(handler.playbackState.value.controls, contains(MediaControl.pause));
    expect(handler.playbackState.value.controls, contains(MediaControl.stop));
  });

  test('publishes the file name and sender for audio attachments', () {
    ChatAudioService.instance.setActiveItemForTesting(
      'audio-1',
      isPlaying: false,
      position: const Duration(seconds: 5),
      duration: const Duration(seconds: 40),
      uri: 'https://example.com/song.mp3',
      title: 'song.mp3',
      subtitle: 'Bob',
    );

    expect(handler.mediaItem.value?.title, 'song.mp3');
    expect(handler.mediaItem.value?.artist, 'Bob');
    expect(handler.playbackState.value.playing, isFalse);
    expect(handler.playbackState.value.controls, contains(MediaControl.play));
  });

  test('goes idle when the message reaches the end', () {
    ChatAudioService.instance.setActiveItemForTesting(
      'audio-1',
      isPlaying: true,
      position: const Duration(seconds: 40),
      duration: const Duration(seconds: 40),
      uri: 'https://example.com/song.mp3',
      title: 'song.mp3',
    );
    expect(
      handler.playbackState.value.processingState,
      AudioProcessingState.ready,
    );

    ChatAudioService.instance.setActiveItemForTesting(
      'audio-1',
      isPlaying: false,
      position: Duration.zero,
      duration: const Duration(seconds: 40),
      uri: 'https://example.com/song.mp3',
      title: 'song.mp3',
    );

    expect(
      handler.playbackState.value.processingState,
      AudioProcessingState.idle,
    );
    expect(handler.playbackState.value.controls, isEmpty);
  });
}
