import 'package:audio_service/audio_service.dart';
import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart' show Color;
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/core/config/global.dart';
import 'package:novyse/core/l10n/l10n.dart';

/// Registers [ChatAudioService] with the native media session.
///
/// This is what keeps voice and music messages playing while the app is in the
/// background and exposes them in the media notification, on the lock screen
/// and through headset buttons. `audioplayers` alone does not provide any of
/// that, so the player is wrapped in an `AudioHandler`.
abstract final class ChatAudioBackground {
  static ChatAudioHandler? _handler;

  /// Background media controls are available on Android and iOS only.
  static bool get isSupported =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  static Future<void> init() async {
    if (!isSupported || _handler != null) return;

    final l10n = lookupAppL10n();
    try {
      _handler = await AudioService.init(
        builder: () => ChatAudioHandler(ChatAudioService.instance),
        config: AudioServiceConfig(
          androidNotificationChannelId: '$appId.channel.audio',
          androidNotificationChannelName: l10n.notifChannelAudio,
          androidNotificationChannelDescription: l10n.notifChannelAudioDesc,
          androidNotificationIcon: 'drawable/notification_icon',
          androidShowNotificationBadge: false,
          androidNotificationOngoing: false,
          androidStopForegroundOnPause: false,
          notificationColor: const Color(0xFF4F8CFF),
          preloadArtwork: false,
        ),
      );
    } catch (e, st) {
      debugPrint('[ChatAudioBackground] init skipped: $e\n$st');
    }
  }
}

/// Bridges [ChatAudioService] state to the platform media session and forwards
/// notification/lock-screen actions back to the player.
class ChatAudioHandler extends BaseAudioHandler {
  ChatAudioHandler(this._service) {
    _service.addListener(_sync);
    _sync();
  }

  final ChatAudioService _service;

  String? _lastMediaId;
  String? _lastTitle;
  String? _lastArtist;
  int? _lastDurationMs;
  String? _lastStateId;
  bool? _lastPlaying;
  double? _lastSpeed;
  AudioProcessingState? _lastProcessing;
  Duration _lastPosition = Duration.zero;
  DateTime? _lastPublishedAt;

  @override
  Future<void> play() => _service.resume();

  @override
  Future<void> pause() => _service.pause();

  @override
  Future<void> stop() => _service.stop();

  @override
  Future<void> seek(Duration position) async {
    await _service.seek(position);
    _publish();
  }

  @override
  Future<void> setSpeed(double speed) async {
    await _service.setSpeed(speed);
    _publish();
  }

  void _sync() {
    final id = _service.activeId;
    final uri = _service.activeUri;
    final hasTrack = id != null && uri != null && uri.isNotEmpty;

    final l10n = lookupAppL10n();
    final kind = _service.activeIsVoice
        ? l10n.msgFormatVoiceSingular
        : l10n.msgFormatAudioSingular;
    final rawTitle = _service.activeTitle?.trim() ?? '';
    final rawSubtitle = _service.activeSubtitle?.trim() ?? '';
    final title = hasTrack ? (rawTitle.isNotEmpty ? rawTitle : kind) : '';
    final artist = hasTrack
        ? (rawSubtitle.isNotEmpty
              ? rawSubtitle
              : (_service.activeIsVoice && rawTitle.isNotEmpty ? kind : null))
        : null;
    final duration = _service.duration > Duration.zero
        ? _service.duration
        : null;

    if (hasTrack &&
        (id != _lastMediaId ||
            title != _lastTitle ||
            artist != _lastArtist ||
            duration?.inMilliseconds != _lastDurationMs)) {
      mediaItem.add(
        MediaItem(id: id, title: title, artist: artist, duration: duration),
      );
      _lastMediaId = id;
      _lastTitle = title;
      _lastArtist = artist;
      _lastDurationMs = duration?.inMilliseconds;
    }

    // A finished message leaves the in-app voice bar active at position zero:
    // hide the system notification instead of keeping a foreground service
    // alive forever. Replaying publishes a ready state again.
    final completed =
        hasTrack &&
        !_service.isPlaying &&
        _service.position == Duration.zero &&
        _service.duration > Duration.zero;
    final processing = hasTrack && !completed
        ? AudioProcessingState.ready
        : AudioProcessingState.idle;
    final playing = hasTrack && !completed && _service.isPlaying;
    final speed = _service.speed;
    final positionJumped =
        (_service.position - _expectedPosition()).abs() >
        const Duration(milliseconds: 900);

    final stateChanged =
        processing != _lastProcessing ||
        playing != _lastPlaying ||
        speed != _lastSpeed ||
        id != _lastStateId ||
        positionJumped;

    if (stateChanged) {
      _publish();
    }
  }

  /// Position the notification is currently projecting from the last update.
  Duration _expectedPosition() {
    if (_lastPlaying != true || _lastPublishedAt == null) return _lastPosition;
    final elapsed = DateTime.now().difference(_lastPublishedAt!);
    return _lastPosition + elapsed * (_lastSpeed ?? 1.0);
  }

  void _publish() {
    final id = _service.activeId;
    final uri = _service.activeUri;
    final hasTrack = id != null && uri != null && uri.isNotEmpty;
    final completed =
        hasTrack &&
        !_service.isPlaying &&
        _service.position == Duration.zero &&
        _service.duration > Duration.zero;
    final active = hasTrack && !completed;
    final playing = active && _service.isPlaying;
    final position = _service.position;
    final processing = active
        ? AudioProcessingState.ready
        : AudioProcessingState.idle;

    playbackState.add(
      PlaybackState(
        controls: active
            ? [
                playing ? MediaControl.pause : MediaControl.play,
                MediaControl.stop,
              ]
            : const [],
        systemActions: active ? const {MediaAction.seek} : const {},
        androidCompactActionIndices: active ? const [0, 1] : const [],
        processingState: processing,
        playing: playing,
        updatePosition: position,
        bufferedPosition: position,
        speed: _service.speed,
        queueIndex: 0,
      ),
    );

    _lastStateId = id;
    _lastPlaying = playing;
    _lastSpeed = _service.speed;
    _lastProcessing = processing;
    _lastPosition = position;
    _lastPublishedAt = DateTime.now();

    // Forget the media item when the session goes idle so replaying the same
    // message publishes its metadata to the platform again.
    if (!active) {
      _lastMediaId = null;
      _lastTitle = null;
      _lastArtist = null;
      _lastDurationMs = null;
    }
  }
}
