import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Centralized audio service for chat voice and audio messages.
/// Ensures that ONLY ONE audio or voice message can be played at any given time.
/// Playing a new track automatically stops/pauses any previous playback.
class ChatAudioService extends ChangeNotifier {
  ChatAudioService._();

  static final ChatAudioService instance = ChatAudioService._();

  final AudioPlayer _player = AudioPlayer();

  StreamSubscription<PlayerState>? _stateSub;
  StreamSubscription<Duration>? _positionSub;
  StreamSubscription<Duration>? _durationSub;
  StreamSubscription<void>? _completeSub;

  String? _activeId;
  String? _activeUri;
  bool _isPlaying = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  double _speed = 1.0;

  /// Identifier (UUID or key) of the currently loaded/playing audio item.
  String? get activeId => _activeId;

  /// Playable URI of the currently active item.
  String? get activeUri => _activeUri;

  /// Whether playback is currently active.
  bool get isPlaying => _isPlaying;

  /// Current playback position of the active item.
  Duration get position => _position;

  /// Total duration of the active item.
  Duration get duration => _duration;

  /// Current playback speed multiplier (e.g. 1.0, 1.5, 2.0).
  double get speed => _speed;

  void _initSubscriptions() {
    _cancelSubscriptions();

    _stateSub = _player.onPlayerStateChanged.listen((state) {
      final playing = state == PlayerState.playing;
      if (_isPlaying != playing) {
        _isPlaying = playing;
        notifyListeners();
      }
    });

    _positionSub = _player.onPositionChanged.listen((pos) {
      _position = pos;
      notifyListeners();
    });

    _durationSub = _player.onDurationChanged.listen((dur) {
      _duration = dur;
      notifyListeners();
    });

    _completeSub = _player.onPlayerComplete.listen((_) {
      _isPlaying = false;
      _position = Duration.zero;
      notifyListeners();
    });
  }

  void _cancelSubscriptions() {
    _stateSub?.cancel();
    _stateSub = null;
    _positionSub?.cancel();
    _positionSub = null;
    _durationSub?.cancel();
    _durationSub = null;
    _completeSub?.cancel();
    _completeSub = null;
  }

  /// Checks whether [id] is the currently active audio item.
  bool isItemActive(String id) => _activeId == id;

  /// Checks whether [id] is currently playing.
  bool isItemPlaying(String id) => _activeId == id && _isPlaying;

  /// Returns the current playback position for [id], or zero if inactive.
  Duration getItemPosition(String id) =>
      _activeId == id ? _position : Duration.zero;

  /// Returns the duration for [id], falling back to [fallback] if inactive.
  Duration getItemDuration(String id, [Duration? fallback]) {
    if (_activeId == id && _duration > Duration.zero) {
      return _duration;
    }
    return fallback ?? Duration.zero;
  }

  /// Plays or resumes playback for [id] with [uri].
  /// If another audio was playing, it is stopped immediately.
  Future<void> play({
    required String id,
    required String uri,
    Duration? initialDuration,
  }) async {
    if (uri.isEmpty) return;

    try {
      if (_activeId == id) {
        if (!_isPlaying) {
          if (_position == Duration.zero) {
            await _startPlayback(uri);
          } else {
            await _player.resume();
          }
        }
        return;
      }

      // Stop previous track if any
      await _player.stop();

      _activeId = id;
      _activeUri = uri;
      _position = Duration.zero;
      _duration = initialDuration ?? Duration.zero;
      _isPlaying = false;
      notifyListeners();

      await _startPlayback(uri);
    } catch (e) {
      debugPrint('[ChatAudioService] play error: $e');
      _isPlaying = false;
      notifyListeners();
    }
  }

  Future<void> _startPlayback(String uri) async {
    final isValid =
        uri.startsWith('http://') ||
        uri.startsWith('https://') ||
        uri.startsWith('blob:') ||
        uri.startsWith('data:') ||
        (!kIsWeb && (uri.startsWith('file://') || uri.startsWith('/')));

    if (!isValid) {
      debugPrint(
        '[ChatAudioService] Cannot play invalid or unresolved URI: "$uri"',
      );
      _isPlaying = false;
      notifyListeners();
      return;
    }

    _initSubscriptions();

    Source source;
    if (!kIsWeb && (uri.startsWith('file://') || uri.startsWith('/'))) {
      final cleanPath = uri.startsWith('file://')
          ? uri.replaceFirst('file://', '')
          : uri;
      source = DeviceFileSource(cleanPath);
    } else {
      source = UrlSource(uri);
    }

    try {
      await _player
          .play(source)
          .timeout(const Duration(seconds: 2), onTimeout: () {});
      if (_speed != 1.0) {
        await _player
            .setPlaybackRate(_speed)
            .timeout(const Duration(milliseconds: 500), onTimeout: () {});
      }
    } catch (e) {
      debugPrint('[ChatAudioService] playback error: $e');
    }
  }

  /// Pauses current playback.
  Future<void> pause() async {
    if (_isPlaying) {
      try {
        await _player.pause().timeout(
          const Duration(milliseconds: 500),
          onTimeout: () {},
        );
      } catch (e) {
        debugPrint('[ChatAudioService] pause error: $e');
      }
      _isPlaying = false;
      notifyListeners();
    }
  }

  /// Stops current playback and resets position.
  Future<void> stop() async {
    if (_activeId != null || _isPlaying) {
      try {
        await _player.stop().timeout(
          const Duration(milliseconds: 500),
          onTimeout: () {},
        );
      } catch (_) {}
    }
    _cancelSubscriptions();
    _position = Duration.zero;
    _isPlaying = false;
    _activeId = null;
    _activeUri = null;
    notifyListeners();
  }

  /// Seeks to [targetPosition] in the active audio.
  Future<void> seek(Duration targetPosition) async {
    try {
      await _player
          .seek(targetPosition)
          .timeout(const Duration(milliseconds: 500), onTimeout: () {});
    } catch (e) {
      debugPrint('[ChatAudioService] seek error: $e');
    }
  }

  /// Sets playback speed without native player for testing or internal updates.
  @visibleForTesting
  void setActiveItemForTesting(
    String? id, {
    bool isPlaying = false,
    Duration? position,
    Duration? duration,
  }) {
    _activeId = id;
    _isPlaying = isPlaying;
    _position = position ?? Duration.zero;
    _duration = duration ?? Duration.zero;
    notifyListeners();
  }

  /// Resets state for testing.
  @visibleForTesting
  void resetForTesting() {
    _cancelSubscriptions();
    _activeId = null;
    _activeUri = null;
    _isPlaying = false;
    _position = Duration.zero;
    _duration = Duration.zero;
    _speed = 1.0;
    notifyListeners();
  }

  /// Sets the playback rate multiplier (e.g. 1.0, 1.5, 2.0).
  Future<void> setSpeed(double newSpeed) async {
    _speed = newSpeed;
    notifyListeners();
    try {
      await _player.setPlaybackRate(newSpeed);
    } catch (e) {
      debugPrint('[ChatAudioService] setSpeed error: $e');
    }
  }

  /// Toggles play/pause for [id].
  Future<void> togglePlayPause({
    required String id,
    required String uri,
    Duration? initialDuration,
  }) async {
    if (isItemPlaying(id)) {
      await pause();
    } else {
      await play(id: id, uri: uri, initialDuration: initialDuration);
    }
  }

  @override
  void dispose() {
    _stateSub?.cancel();
    _positionSub?.cancel();
    _durationSub?.cancel();
    _completeSub?.cancel();
    _player.dispose();
    super.dispose();
  }
}

/// Riverpod provider for reactive UI consumption of ChatAudioService.
final chatAudioServiceProvider = ChangeNotifierProvider<ChatAudioService>(
  (ref) => ChatAudioService.instance,
);
