import 'dart:async';
import 'dart:io' as io;

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/core/storage/file/file.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

@immutable
class VoiceRecorderState {
  final bool isRecording;
  final bool isPaused;
  final Duration duration;
  final double amplitude; // Decibels, typically -60 dB to 0 dB
  final String? recordedFilePath;

  const VoiceRecorderState({
    this.isRecording = false,
    this.isPaused = false,
    this.duration = Duration.zero,
    this.amplitude = -60.0,
    this.recordedFilePath,
  });

  VoiceRecorderState copyWith({
    bool? isRecording,
    bool? isPaused,
    Duration? duration,
    double? amplitude,
    String? Function()? recordedFilePath,
  }) {
    return VoiceRecorderState(
      isRecording: isRecording ?? this.isRecording,
      isPaused: isPaused ?? this.isPaused,
      duration: duration ?? this.duration,
      amplitude: amplitude ?? this.amplitude,
      recordedFilePath: recordedFilePath != null
          ? recordedFilePath()
          : this.recordedFilePath,
    );
  }
}

class VoiceRecorderNotifier
    extends AutoDisposeFamilyNotifier<VoiceRecorderState, String> {
  AudioRecorder? _audioRecorder;
  Timer? _ticker;
  DateTime? _recordingStartTime;
  Duration _accumulatedDuration = Duration.zero;

  @override
  VoiceRecorderState build(String arg) {
    _audioRecorder = AudioRecorder();
    ref.onDispose(() {
      _ticker?.cancel();
      _audioRecorder?.dispose();
      _audioRecorder = null;
    });
    return const VoiceRecorderState();
  }

  AudioRecorder get _recorder => _audioRecorder ??= AudioRecorder();

  Future<bool> startRecording() async {
    try {
      final hasPermission = await _recorder.hasPermission();
      if (!hasPermission) {
        debugPrint('[VoiceRecorder] Microphone permission denied');
        return false;
      }

      String? filePath;
      if (!kIsWeb) {
        final tempDir = await getTemporaryDirectory();
        final fileName =
            'novyse_vocal_${DateTime.now().millisecondsSinceEpoch}.m4a';
        filePath = p.join(tempDir.path, fileName);
      }

      final config = RecordConfig(
        encoder: kIsWeb ? AudioEncoder.opus : AudioEncoder.aacLc,
        bitRate: 128000,
        sampleRate: 44100,
      );

      if (filePath != null) {
        await _recorder.start(config, path: filePath);
      } else {
        await _recorder.start(config, path: '');
      }

      _recordingStartTime = DateTime.now();
      _accumulatedDuration = Duration.zero;

      state = state.copyWith(
        isRecording: true,
        isPaused: false,
        duration: Duration.zero,
        amplitude: -60.0,
        recordedFilePath: () => filePath,
      );

      _startTicker();
      return true;
    } catch (e) {
      debugPrint('[VoiceRecorder] Error starting recording: $e');
      _stopTicker();
      state = const VoiceRecorderState();
      return false;
    }
  }

  Future<void> pauseRecording() async {
    if (!state.isRecording || state.isPaused) return;
    try {
      await _recorder.pause();
      if (_recordingStartTime != null) {
        _accumulatedDuration += DateTime.now().difference(_recordingStartTime!);
        _recordingStartTime = null;
      }
      _stopTicker();
      state = state.copyWith(isPaused: true, amplitude: -60.0);
    } catch (e) {
      debugPrint('[VoiceRecorder] Error pausing recording: $e');
    }
  }

  Future<void> resumeRecording() async {
    if (!state.isRecording || !state.isPaused) return;
    try {
      await _recorder.resume();
      _recordingStartTime = DateTime.now();
      state = state.copyWith(isPaused: false);
      _startTicker();
    } catch (e) {
      debugPrint('[VoiceRecorder] Error resuming recording: $e');
    }
  }

  Future<void> togglePause() async {
    if (state.isPaused) {
      await resumeRecording();
    } else {
      await pauseRecording();
    }
  }

  Future<void> cancelRecording() async {
    if (!state.isRecording) return;
    _stopTicker();
    final previousState = state;
    state = const VoiceRecorderState();
    try {
      final path = await _recorder.stop().timeout(
        const Duration(milliseconds: 500),
        onTimeout: () => null,
      );
      final effectivePath = path ?? previousState.recordedFilePath;
      if (effectivePath != null && !kIsWeb) {
        final file = io.File(effectivePath);
        if (await file.exists()) {
          await file.delete();
        }
      }
    } catch (e) {
      debugPrint('[VoiceRecorder] Error cancelling recording: $e');
    }
  }

  Future<void> stopAndDraft() async {
    if (!state.isRecording) return;
    _stopTicker();
    final previousState = state;
    state = const VoiceRecorderState();
    final chatUUID = arg;
    try {
      final path = await _recorder.stop().timeout(
        const Duration(milliseconds: 500),
        onTimeout: () => null,
      );
      final effectivePath = path ?? previousState.recordedFilePath;

      if (effectivePath == null) return;

      int fileSize = 0;
      Uint8List? bytes;

      if (!kIsWeb) {
        final file = io.File(effectivePath);
        if (await file.exists()) {
          fileSize = await file.length();
        }
      } else {
        bytes = await FileStorage.instance.getBytes(effectivePath);
        fileSize = bytes?.length ?? 0;
      }

      final ext = kIsWeb ? 'webm' : 'm4a';
      final mime = kIsWeb ? 'audio/webm' : 'audio/aac';
      final fileName =
          'novyse_vocal_${DateTime.now().millisecondsSinceEpoch}.$ext';
      final vocalFile = {
        'name': fileName,
        'uri': effectivePath,
        'path': effectivePath,
        'bytes': bytes,
        'mimeType': mime,
        'size': fileSize,
        'type': 'VOICE',
      };

      final draftNotifier = ref.read(chatDraftProvider(chatUUID).notifier);
      final currentFiles = List<dynamic>.from(
        ref.read(chatDraftProvider(chatUUID)).files,
      );
      currentFiles.add(vocalFile);
      draftNotifier.setFiles(currentFiles);

      // Validate files against constraints
      final validation = validateFiles(currentFiles);
      draftNotifier.setInvalidFiles(
        validation.invalidFilesData.map((d) => d.toMap()).toList(),
      );
    } catch (e) {
      debugPrint('[VoiceRecorder] Error adding vocal to draft: $e');
    }
  }

  Future<void> stopAndSend({int subID = 0}) async {
    if (!state.isRecording) return;
    _stopTicker();
    final previousState = state;
    state = const VoiceRecorderState();
    final chatUUID = arg;
    try {
      final path = await _recorder.stop().timeout(
        const Duration(milliseconds: 500),
        onTimeout: () => null,
      );
      final effectivePath = path ?? previousState.recordedFilePath;

      if (effectivePath == null) return;

      int fileSize = 0;
      Uint8List? bytes;

      if (!kIsWeb) {
        final file = io.File(effectivePath);
        if (await file.exists()) {
          fileSize = await file.length();
        }
      } else {
        bytes = await FileStorage.instance.getBytes(effectivePath);
        fileSize = bytes?.length ?? 0;
      }

      final ext = kIsWeb ? 'webm' : 'm4a';
      final mime = kIsWeb ? 'audio/webm' : 'audio/aac';
      final fileName =
          'novyse_vocal_${DateTime.now().millisecondsSinceEpoch}.$ext';
      final vocalFile = {
        'name': fileName,
        'uri': effectivePath,
        'path': effectivePath,
        'bytes': bytes,
        'mimeType': mime,
        'size': fileSize,
        'type': 'VOICE',
      };

      final localUserUUID = ref.read(userStoreProvider).localUserUUID;
      final tempId = DateTime.now().millisecondsSinceEpoch;
      final now = DateTime.now().toUtc().toIso8601String();

      final queueManager = ref.read(queueManagerProvider);
      await queueManager.addOutgoingMessageJob(
        id: tempId.toString(),
        chatUUID: chatUUID,
        subID: subID,
        message: {
          'id': tempId,
          'chatUUID': chatUUID,
          'subID': subID,
          'senderUUID': localUserUUID,
          'userUUID': localUserUUID,
          'content': '',
          'type': 'message',
          'createdAt': now,
          'status': 'PENDING_SEND',
          'files': [vocalFile],
        },
        files: [vocalFile],
      );
    } catch (e) {
      debugPrint('[VoiceRecorder] Error sending vocal message: $e');
    }
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(milliseconds: 60), (_) async {
      var currentDuration = _accumulatedDuration;
      if (_recordingStartTime != null) {
        currentDuration += DateTime.now().difference(_recordingStartTime!);
      }

      double currentAmp = -60.0;
      try {
        if (_audioRecorder != null && state.isRecording && !state.isPaused) {
          final amp = await _audioRecorder!.getAmplitude();
          currentAmp = amp.current;
        }
      } catch (_) {}

      state = state.copyWith(duration: currentDuration, amplitude: currentAmp);
    });
  }

  void _stopTicker() {
    _ticker?.cancel();
    _ticker = null;
  }
}

final voiceRecorderProvider =
    AutoDisposeNotifierProviderFamily<
      VoiceRecorderNotifier,
      VoiceRecorderState,
      String
    >(VoiceRecorderNotifier.new);
