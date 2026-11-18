import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/plugins/activity_controller.dart';
import 'package:novyse/core/plugins/bridge/bridge_factory.dart';
import 'package:novyse/core/plugins/bridge/plugin_bridge.dart';
import 'package:novyse/core/plugins/models/activity_event.dart';
import 'package:novyse/core/plugins/models/activity_instance.dart';
import 'package:novyse/core/plugins/plugin_cache.dart';
import 'package:novyse/core/plugins/plugin_exception.dart';
import 'package:novyse/core/plugins/ui/plugin_native_player.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// The states of the tile.
///
/// There is no `UNTRUSTED_PROMPT`: every plugin comes from our repository, so
/// a confirmation step would only teach the users to dismiss a warning.
enum ActivityTileStatus { resolving, downloading, loading, running, failed }

/// One activity rendered inside the voice room grid.
///
/// The tile owns the sandbox: it installs the pinned build, mounts it and
/// bridges the `STREAM` packets and the participants of the room into it. It
/// never decides what the plugin may do: every request goes to the controller.
class ActivityTile extends ConsumerStatefulWidget {
  const ActivityTile({super.key, required this.instance, this.onCommand});

  final ActivityInstance instance;

  /// Commands the plugin asked the host to execute: fullscreen, restore, close.
  final void Function(ActivityCommand)? onCommand;

  @override
  ConsumerState<ActivityTile> createState() => _ActivityTileState();
}

class _ActivityTileState extends ConsumerState<ActivityTile> {
  /// How long the install of a build may take before the tile gives up.
  static const Duration installTimeout = Duration(minutes: 2);

  PluginBridge? _bridge;
  ActivityTileStatus _status = ActivityTileStatus.resolving;
  double? _progress;
  String? _error;

  StreamSubscription<dynamic>? _packets;
  StreamSubscription<dynamic>? _commands;
  StreamSubscription<({String instanceId, ActivityEvent event})>? _states;
  StreamSubscription<({String instanceId, Map<String, dynamic> payload})>?
  _actions;
  StreamSubscription<({String instanceId, bool playing, double position})>?
  _playerSync;

  /// Room state of this activity, handed to the native player.
  final StreamController<({bool playing, double position})> _playerCommands =
      StreamController<({bool playing, double position})>.broadcast();

  /// Highest mutation already handed to the sandbox, so a mutation that comes
  /// back both as the local acknowledgement and as a publication is applied
  /// once.
  int _stateSeq = 0;

  /// Bumped on every resolve: a resolve that finishes after a newer one only
  /// throws its own sandbox away, it never replaces the current one.
  int _generation = 0;

  /// `<instanceId>@<version>` of the sandbox currently mounted, `null` when
  /// there is none. It makes `_resolve` a no-op when the build is already
  /// running, which is what a rebuild of the card must never restart.
  String? _mountKey;

  @override
  void initState() {
    super.initState();

    _start();
  }

  void _start() {
    final controller = ref.read(activityControllerProvider.notifier);

    _packets ??= controller.packets.listen(_onPacket);
    _commands ??= controller.commands.listen(_onCommand);
    _states ??= controller.stateEvents.listen(_onState);
    _actions ??= controller.actionEvents.listen(_onAction);
    _playerSync ??= controller.nativePlayerSync.listen(_onPlayerSync);

    unawaited(_resolve());
  }

  @override
  void didUpdateWidget(ActivityTile oldWidget) {
    super.didUpdateWidget(oldWidget);

    final previous = oldWidget.instance;
    final current = widget.instance;

    if (previous.instanceId == current.instanceId &&
        previous.version == current.version) {
      return;
    }

    unawaited(_disposeBridge());
    unawaited(_resolve());
  }

  @override
  void dispose() {
    unawaited(_packets?.cancel());
    unawaited(_commands?.cancel());
    unawaited(_states?.cancel());
    unawaited(_actions?.cancel());
    unawaited(_playerSync?.cancel());
    unawaited(_playerCommands.close());

    final bridge = _bridge;
    _bridge = null;

    if (bridge != null) {
      // Both started at once: the goodbye is best effort, but the sandbox must
      // be destroyed even if that message never gets through.
      unawaited(bridge.emit('activity:ended', {'reason': 'stopped'}));
      unawaited(bridge.dispose());
    }

    unawaited(
      PluginCache.instance.release(
        widget.instance.slug,
        widget.instance.version,
      ),
    );

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Participants change without touching the instance: the plugin learns
    // about them from the SDK, not from a rebuild.
    ref.listen<ActivitiesState>(activityControllerProvider, (previous, next) {
      if (listEquals(previous?.participants, next.participants)) return;
      unawaited(_emitParticipants());
    });

    // The video the plugin asked the app to play, if any: it covers the
    // sandbox, which stays mounted underneath so the SDK keeps answering.
    final nativeUrl = ref.watch(
      activityControllerProvider.select(
        (state) => state.nativePlayers[widget.instance.instanceId],
      ),
    );

    // The clip belongs to the card, not to the tile: `webview_all` 1.4.12
    // keeps a WebView alive inside a supported Flutter clip, GTK overlay
    // included, so the sandbox follows the shape of the card.
    // A participant who cannot write the room cannot drive its player either.
    final readOnly = ref.watch(
      activityControllerProvider.select((state) => state.readOnly),
    );

    return ColoredBox(
      color: Colors.black,
      child: _content(context, nativeUrl, readOnly),
    );
  }

  Widget _content(BuildContext context, String? nativeUrl, bool readOnly) {
    switch (_status) {
      case ActivityTileStatus.running:
        final bridge = _bridge;

        // The card must never be empty: if the sandbox went away between two
        // frames the tile shows it is working on it instead of a black hole.
        if (bridge == null) {
          return _centered(children: const [CircularProgressIndicator()]);
        }

        final sandbox = bridge.build(context);

        if (nativeUrl == null) return sandbox;

        // Offstage, not removed: the plugin must stay alive to receive the
        // state of the room and the "closed" event of this player.
        return Stack(
          fit: StackFit.expand,
          children: [
            if (kIsWeb) sandbox else Offstage(child: sandbox),
            PluginNativePlayer(
              key: ValueKey(nativeUrl),
              url: nativeUrl,
              commands: _playerCommands.stream,
              interactive: !readOnly,
              onIntent: _onPlayerIntent,
              onBack: _closeNativePlayer,
            ),
          ],
        );

      case ActivityTileStatus.downloading:
        return _centered(
          children: [
            SizedBox(
              width: 120,
              child: LinearProgressIndicator(value: _progress, minHeight: 3),
            ),
          ],
        );

      case ActivityTileStatus.resolving:
      case ActivityTileStatus.loading:
        return _centered(children: const [CircularProgressIndicator()]);

      case ActivityTileStatus.failed:
        return _centered(
          children: [
            const AppHugeIcon(
              icon: HugeIcons.strokeRoundedAlert02,
              color: Colors.white70,
              size: 22,
            ),
            const SizedBox(height: 6),
            Text(
              _error ?? 'E_INTERNAL',
              style: const TextStyle(color: Colors.white60, fontSize: 11),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 2),
            TextButton(
              onPressed: () => unawaited(_resolve()),
              child: const Text(
                'Retry',
                style: TextStyle(color: Colors.white, fontSize: 11),
              ),
            ),
          ],
        );
    }
  }

  /// The room asked the native player of this activity to follow it.
  void _onPlayerSync(
    ({String instanceId, bool playing, double position}) command,
  ) {
    if (command.instanceId != widget.instance.instanceId) return;

    if (_playerCommands.isClosed) return;

    _playerCommands.add((playing: command.playing, position: command.position));
  }

  /// The user touched the native player of the app.
  void _onPlayerIntent(bool playing, double position) {
    unawaited(
      _bridge?.emit('activity:player', {
        'state': 'intent',
        'playing': playing,
        'position': position,
      }),
    );
  }

  Widget _centered({required List<Widget> children}) => Center(
    child: Padding(
      padding: const EdgeInsets.all(8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            widget.instance.slug,
            style: const TextStyle(color: Colors.white70, fontSize: 11),
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    ),
  );

  Future<void> _resolve() async {
    final instance = widget.instance;
    final mountKey = '${instance.instanceId}@${instance.version}';

    // Already mounted: a rebuild of the card is not a reason to download the
    // build again and to mount a second sandbox on the same instance.
    if (_mountKey == mountKey && _bridge != null) return;

    final generation = ++_generation;

    // The plugin replays these events from `init`: anything up to the last one
    // is already in its hands. A new sandbox starts from that snapshot, which
    // is why nothing published before it mounts has to be buffered: `init` is
    // answered after the download, so it contains those mutations too.
    _stateSeq = instance.events.isEmpty ? 0 : instance.events.last.seq;

    debugPrint('[ActivityTile] ${instance.slug}@${instance.version}: resolve');

    if (mounted) {
      setState(() {
        _status = ActivityTileStatus.resolving;
        _error = null;
        _progress = null;
      });
    }

    // Pinned before the download: the LRU sweep must never drop the build a
    // running tile is about to mount.
    await PluginCache.instance.protect(instance.slug, instance.version);

    unawaited(_checkForUpdate(instance));

    if (!mounted || generation != _generation) return;
    setState(() => _status = ActivityTileStatus.downloading);

    debugPrint('[ActivityTile] ${instance.slug}: downloading');

    final PluginBridge bridge;
    try {
      final build = await PluginCache.instance
          .load(
            slug: instance.slug,
            version: instance.version,
            bundle: instance.bundle,
            onProgress: (received, total) {
              if (!mounted || generation != _generation) return;
              setState(() {
                _progress = total <= 0
                    ? null
                    : (received / total).clamp(0.0, 1.0);
              });
            },
          )
          .timeout(installTimeout);

      debugPrint(
        '[ActivityTile] ${instance.slug} installed at '
        '${build.filePath ?? 'memory'}',
      );

      if (!mounted || generation != _generation) return;
      setState(() => _status = ActivityTileStatus.loading);

      bridge = createPluginBridge(
        instanceId: instance.instanceId,
        onRequest: (request) => ref
            .read(activityControllerProvider.notifier)
            .handleRequest(instance.instanceId, request),
      );

      debugPrint(
        '[ActivityTile] ${instance.slug}: bridge ${bridge.runtimeType}',
      );

      await bridge.load(build);

      debugPrint('[ActivityTile] ${instance.slug} mounted');
    } on TimeoutException catch (error) {
      if (!mounted || generation != _generation) return;

      debugPrint('[ActivityTile] ${instance.slug} timed out: $error');
      setState(() {
        _status = ActivityTileStatus.failed;
        _error = 'E_TIMEOUT';
      });
      return;
    } on PluginCacheException catch (error) {
      debugPrint(
        '[ActivityTile] ${instance.slug} failed: ${error.code} ${error.message}',
      );

      if (!mounted || generation != _generation) return;
      setState(() {
        _status = ActivityTileStatus.failed;
        _error = error.code;
      });
      return;
    } catch (error) {
      debugPrint('[ActivityTile] ${instance.slug} failed: $error');

      if (!mounted || generation != _generation) return;
      setState(() {
        _status = ActivityTileStatus.failed;
        _error = 'E_INTERNAL';
      });
      return;
    }

    if (!mounted || generation != _generation) {
      unawaited(bridge.dispose());
      return;
    }

    setState(() {
      _bridge = bridge;
      _mountKey = mountKey;
      _status = ActivityTileStatus.running;
      _progress = null;
    });

    unawaited(_emitParticipants());
  }

  /// Launch-time update check.
  ///
  /// Invisible by design: the tile mounts the version pinned in the room, and
  /// a failed check must not change that. On success the current build is
  /// downloaded in the background, so the next start is instant.
  Future<void> _checkForUpdate(ActivityInstance instance) async {
    try {
      final entry = await apiGateway.plugins.registry.get(instance.slug);

      if (entry.version == instance.version || !entry.hasBundle) return;

      await PluginCache.instance.load(
        slug: entry.slug,
        version: entry.version,
        bundle: entry.bundle,
      );
    } catch (error) {
      debugPrint('Plugin update check failed for ${instance.slug}: $error');
    }
  }

  Future<void> _disposeBridge() async {
    final bridge = _bridge;
    _bridge = null;
    _mountKey = null;

    // A resolve still in flight must throw its sandbox away instead of
    // installing it under a tile that is going away.
    _generation++;

    if (bridge != null) {
      // The goodbye is best effort: it must never delay the destruction of the
      // sandbox, which owns a native view on Linux.
      unawaited(bridge.emit('activity:ended', {'reason': 'stopped'}));
      await bridge.dispose();
    }

    await PluginCache.instance.release(
      widget.instance.slug,
      widget.instance.version,
    );
  }

  Future<void> _emitParticipants() async {
    final bridge = _bridge;
    if (bridge == null) return;

    await bridge.emit(
      'activity:participants',
      ref.read(activityControllerProvider).participants,
    );
  }

  /// Forwards one action of the room to the sandbox.
  ///
  /// An action is what a plugin says to the others in its own vocabulary: the
  /// host carries it and never reads it.
  void _onAction(({String instanceId, Map<String, dynamic> payload}) action) {
    if (action.instanceId != widget.instance.instanceId) return;

    unawaited(_bridge?.emit('activity:action', action.payload));
  }

  void _onPacket(({String instanceId, String sender, Uint8List bytes}) packet) {
    if (packet.instanceId != widget.instance.instanceId) return;

    unawaited(
      _bridge?.emit('activity:stream', {
        'sender': packet.sender,
        'data': base64Encode(packet.bytes),
      }),
    );
  }

  /// Forwards one mutation of the room to the sandbox.
  void _onState(({String instanceId, ActivityEvent event}) change) {
    if (change.instanceId != widget.instance.instanceId) return;
    if (change.event.seq <= _stateSeq) return;

    final bridge = _bridge;
    if (bridge == null) return;

    _stateSeq = change.event.seq;

    unawaited(bridge.emit('activity:state', change.event.toJson()));
  }

  /// Hands the tile back to the plugin: closes the native player and tells the
  /// sandbox, which returns to its own first screen.
  void _closeNativePlayer() {
    ref
        .read(activityControllerProvider.notifier)
        .closeNativePlayer(widget.instance.instanceId);

    unawaited(_bridge?.emit('activity:player', {'state': 'closed'}));
  }

  void _onCommand(ActivityCommand command) {
    if (command.instanceId != widget.instance.instanceId) return;
    widget.onCommand?.call(command);
  }
}
