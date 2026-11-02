import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/plugins/activity_controller.dart';
import 'package:novyse/core/plugins/bridge/bridge_factory.dart';
import 'package:novyse/core/plugins/bridge/plugin_bridge.dart';
import 'package:novyse/core/plugins/models/activity_instance.dart';
import 'package:novyse/core/plugins/plugin_cache.dart';
import 'package:novyse/core/plugins/plugin_exception.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:url_launcher/url_launcher.dart';

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
  PluginBridge? _bridge;
  ActivityTileStatus _status = ActivityTileStatus.resolving;
  double? _progress;
  String? _error;

  StreamSubscription<dynamic>? _packets;
  StreamSubscription<dynamic>? _commands;

  @override
  void initState() {
    super.initState();

    final controller = ref.read(activityControllerProvider.notifier);

    _packets = controller.packets.listen(_onPacket);
    _commands = controller.commands.listen(_onCommand);

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

    final bridge = _bridge;
    if (bridge != null) {
      unawaited(
        bridge
            .emit('activity:ended', {'reason': 'stopped'})
            .whenComplete(() => bridge.dispose()),
      );
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

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Container(color: Colors.black, child: _content(context)),
    );
  }

  Widget _content(BuildContext context) {
    switch (_status) {
      case ActivityTileStatus.running:
        final bridge = _bridge;
        if (bridge == null) return const SizedBox.shrink();
        return bridge.build(context);

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

    if (!mounted) return;
    setState(() => _status = ActivityTileStatus.downloading);

    final PluginBridge bridge;
    try {
      final build = await PluginCache.instance.load(
        slug: instance.slug,
        version: instance.version,
        bundle: instance.bundle,
        onProgress: (received, total) {
          if (!mounted) return;
          setState(() {
            _progress = total <= 0 ? null : (received / total).clamp(0.0, 1.0);
          });
        },
      );

      if (!mounted) return;
      setState(() => _status = ActivityTileStatus.loading);

      bridge = createPluginBridge(
        instanceId: instance.instanceId,
        onRequest: (request) => ref
            .read(activityControllerProvider.notifier)
            .handleRequest(instance.instanceId, request),
        openExternal: _openExternal,
      );

      await bridge.load(build);
    } on PluginCacheException catch (error) {
      if (!mounted) return;
      setState(() {
        _status = ActivityTileStatus.failed;
        _error = error.code;
      });
      return;
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _status = ActivityTileStatus.failed;
        _error = 'E_INTERNAL';
      });
      return;
    }

    if (!mounted) {
      unawaited(bridge.dispose());
      return;
    }

    setState(() {
      _bridge = bridge;
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

    if (bridge != null) {
      await bridge.emit('activity:ended', {'reason': 'stopped'});
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

  void _onPacket(({String instanceId, String sender, Uint8List bytes}) packet) {
    if (packet.instanceId != widget.instance.instanceId) return;

    unawaited(
      _bridge?.emit('activity:stream', {
        'sender': packet.sender,
        'data': base64Encode(packet.bytes),
      }),
    );
  }

  void _onCommand(ActivityCommand command) {
    if (command.instanceId != widget.instance.instanceId) return;
    widget.onCommand?.call(command);
  }

  Future<void> _openExternal(String url) async {
    try {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (error) {
      debugPrint('Cannot open $url: $error');
    }
  }
}
