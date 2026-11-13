import 'dart:async';

import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:novyse/core/utils/media_kit_initializer.dart';

/// The video of a file link, played by the app instead of the sandbox.
///
/// A plugin runs in a WebView: it can embed a page, not decode an mp4. When it
/// asks the host for a file (`player.open`), the tile mounts this widget above
/// the sandbox and the app owns playback from here: media_kit, so the same
/// decoder the chat already uses, plus the controls the plugin would have had
/// to invent itself.
///
/// The player starts paused. The back button is the way out: it closes the
/// player and hands the tile back to the first screen of the plugin.
class PluginNativePlayer extends StatefulWidget {
  const PluginNativePlayer({
    super.key,
    required this.url,
    required this.onBack,
    this.commands,
    this.onIntent,
    this.interactive = true,
  });

  /// Remote video, `http(s)` only: the host refused anything else.
  final String url;

  /// Closes the player and tells the plugin.
  final VoidCallback onBack;

  /// The room as the plugin of this activity says it is: play and position.
  final Stream<({bool playing, double position})>? commands;


  /// A play, pause or seek made with the chrome of this player.
  final void Function(bool playing, double position)? onIntent;

  /// Whether the user may drive the player.
  ///
  /// A participant who cannot write the room cannot own a playback either: the
  /// player follows the room, and its transport is shown disabled instead of
  /// being offered and then undone on the next tick.
  final bool interactive;

  @override
  State<PluginNativePlayer> createState() => _PluginNativePlayerState();
}

class _PluginNativePlayerState extends State<PluginNativePlayer> {
  late final Player _player;
  late final VideoController _controller;

  final List<StreamSubscription<dynamic>> _subscriptions = [];

  /// How long the user's own action wins over the room, in ms.
  static const Duration _intentHold = Duration(milliseconds: 2500);

  bool _playing = false;
  bool _buffering = true;
  DateTime _intentAt = DateTime.fromMillisecondsSinceEpoch(0);
  bool _muted = false;
  bool _dragging = false;
  double _dragPosition = 0;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  String? _error;

  @override
  void initState() {
    super.initState();

    // The native backend must exist before the first player.
    MediaKitInitializer.ensureInitialized();

    _player = Player();
    _controller = VideoController(_player);

    _subscriptions.addAll([
      _player.stream.playing.listen(
        (playing) => _update(() => _playing = playing),
      ),
      _player.stream.buffering.listen(
        (buffering) => _update(() => _buffering = buffering),
      ),
      _player.stream.position.listen(
        (position) => _update(() => _position = position),
      ),
      _player.stream.duration.listen(
        (duration) => _update(() => _duration = duration),
      ),
      _player.stream.error.listen((error) => _update(() => _error = error)),
    ]);

    final commands = widget.commands;
    if (commands != null) _subscriptions.add(commands.listen(_applyRoom));

    unawaited(_open(widget.url));
  }

  @override
  void didUpdateWidget(PluginNativePlayer oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.url == widget.url) return;

    unawaited(_open(widget.url));
  }

  @override
  void dispose() {
    for (final subscription in _subscriptions) {
      unawaited(subscription.cancel());
    }

    unawaited(_player.dispose());

    super.dispose();
  }

  void _update(VoidCallback change) {
    if (mounted) setState(change);
  }

  Future<void> _open(String url) async {
    _update(() {
      _error = null;
      _buffering = true;
      _position = Duration.zero;
      _duration = Duration.zero;
    });

    try {
      await _player.open(Media(url), play: false);
    } catch (error) {
      _update(() => _error = 'Cannot play this video');
    }
  }

  Future<void> _toggle() {
    if (!widget.interactive) return Future<void>.value();

    final playing = !_playing;

    _reportIntent(playing);

    return playing ? _player.play() : _player.pause();
  }

  void _reportIntent(bool playing, [double? position]) {
    if (!widget.interactive) return;

    _intentAt = DateTime.now();

    widget.onIntent?.call(playing, position ?? _position.inMilliseconds / 1000);
  }

  /// Follows the room: the plugin is the only side that knows the snapshot.
  void _applyRoom(({bool playing, double position}) room) {
    if (_error != null) return;

    // The action of the user wins for a moment: the room is about to echo it,
    // and undoing it here would make the seek impossible to perform.
    if (DateTime.now().difference(_intentAt) < _intentHold) return;

    final target = Duration(milliseconds: (room.position * 1000).round());

    if ((_position - target).abs() > const Duration(milliseconds: 1500)) {
      unawaited(_player.seek(target));
    }

    if (room.playing != _playing) {
      unawaited(room.playing ? _player.play() : _player.pause());
    }
  }

  Future<void> _toggleMute() async {
    final muted = !_muted;

    setState(() => _muted = muted);
    await _player.setVolume(muted ? 0 : 100);
  }

  static String _time(Duration value) {
    final total = value.inSeconds;
    final hours = total ~/ 3600;
    final minutes = (total % 3600) ~/ 60;
    final seconds = total % 60;
    String pad(int part) => part.toString().padLeft(2, '0');

    return hours > 0
        ? '$hours:${pad(minutes)}:${pad(seconds)}'
        : '$minutes:${pad(seconds)}';
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Video(controller: _controller, controls: NoVideoControls),

          if (_error != null)
            _message('This video cannot be played.\n$_error')
          else if (_buffering)
            const Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white70,
                ),
              ),
            ),

          Positioned(
            top: 8,
            left: 8,
            child: _roundButton(
              icon: Icons.arrow_back_rounded,
              tooltip: 'Back to the plugin',
              onPressed: widget.onBack,
            ),
          ),

          if (_error == null)
            Positioned(left: 0, right: 0, bottom: 0, child: _controls()),
        ],
      ),
    );
  }

  Widget _roundButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onPressed,
  }) {
    return Material(
      color: Colors.black54,
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: IconButton(
        icon: Icon(icon, size: 18, color: Colors.white),
        tooltip: tooltip,
        onPressed: onPressed,
        padding: EdgeInsets.zero,
        visualDensity: VisualDensity.compact,
        constraints: const BoxConstraints.tightFor(width: 34, height: 34),
      ),
    );
  }

  Widget _message(String text) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Text(
          text,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.white60, fontSize: 11),
        ),
      ),
    );
  }

  Widget _controls() {
    final interactive = widget.interactive;
    final durationMs = _duration.inMilliseconds > 0
        ? _duration.inMilliseconds
        : 1;
    final value =
        (_dragging ? _dragPosition : _position.inMilliseconds.toDouble()).clamp(
          0.0,
          durationMs.toDouble(),
        );

    return Container(
      padding: const EdgeInsets.fromLTRB(2, 6, 6, 2),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.transparent, Colors.black87],
        ),
      ),
      child: Row(
        children: [
          if (interactive)
            IconButton(
              icon: Icon(
                _playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                color: Colors.white,
                size: 22,
              ),
              tooltip: _playing ? 'Pause' : 'Play',
              onPressed: () => unawaited(_toggle()),
              visualDensity: VisualDensity.compact,
            ),
          Text(
            _time(_position),
            style: const TextStyle(color: Colors.white70, fontSize: 10),
          ),
          if (interactive)
            Expanded(
              child: SliderTheme(
                data: SliderTheme.of(context).copyWith(
                  trackHeight: 2,
                  thumbShape: const RoundSliderThumbShape(
                    enabledThumbRadius: 5,
                  ),
                  overlayShape: SliderComponentShape.noOverlay,
                  activeTrackColor: Colors.white,
                  inactiveTrackColor: Colors.white24,
                  thumbColor: Colors.white,
                  trackShape: const RectangularSliderTrackShape(),
                ),
                child: Slider(
                  value: value,
                  max: durationMs.toDouble(),
                  onChangeStart: (next) => setState(() {
                    _dragging = true;
                    _dragPosition = next;
                  }),
                  onChanged: (next) => setState(() => _dragPosition = next),
                  onChangeEnd: (next) {
                    setState(() => _dragging = false);
                    _reportIntent(_playing, next / 1000);
                    unawaited(
                      _player.seek(Duration(milliseconds: next.round())),
                    );
                  },
                ),
              ),
            )
          else
            const Spacer(),
          Text(
            _time(_duration),
            style: const TextStyle(color: Colors.white70, fontSize: 10),
          ),
          IconButton(
            icon: Icon(
              _muted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
              color: Colors.white,
              size: 18,
            ),
            tooltip: _muted ? 'Unmute' : 'Mute',
            onPressed: () => unawaited(_toggleMute()),
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}
