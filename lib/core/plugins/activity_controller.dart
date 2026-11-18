import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:novyse/core/chat/chat_permission_helpers.dart';
import 'package:novyse/core/chat/permissions.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_state.dart';
import 'package:novyse/core/plugins/activity_channel.dart';
import 'package:novyse/core/plugins/activity_stream.dart';
import 'package:novyse/core/plugins/bridge/bridge_protocol.dart';
import 'package:novyse/core/plugins/models/activity_event.dart';
import 'package:novyse/core/plugins/models/activity_instance.dart';
import 'package:novyse/core/plugins/plugin_exception.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/services/realtime_service.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/themes/themes.dart';

/// Local state of the activities of the voice room the app is in.
///
/// One room at a time: the app runs a single call, so the controller is a
/// singleton and joining another room replaces the previous state.
@immutable
class ActivitiesState {
  const ActivitiesState({
    this.chatUUID,
    this.subID = 0,
    this.instances = const [],
    this.participants = const [],
    this.readOnly = false,
    this.nativePlayers = const {},
    this.loading = false,
    this.error,
  });

  /// The room the state belongs to, `null` when the app is not in a call.
  final String? chatUUID;
  final int subID;

  /// Running activities, oldest first, at most [ActivityController.maxActivities].
  final List<ActivityInstance> instances;

  /// Identities of the participants, `userUUID_sessionID`.
  final List<String> participants;

  /// True when the user cannot mutate the activities: the tiles render a
  /// passive view and every write is refused here and by the server.
  final bool readOnly;

  /// Url of the video the app is playing natively above a tile, per instance.
  ///
  /// A plugin cannot decode video: when it asks for a file, the app mounts its
  /// own player (media_kit) over the sandbox, and the url lives here until the
  /// player is closed.
  final Map<String, String> nativePlayers;

  final bool loading;

  /// Code of the last failure, `null` when there is none.
  final String? error;

  bool isRoom(String chatUUID, int sub) =>
      this.chatUUID == chatUUID && subID == sub;

  ActivityInstance? byId(String instanceId) => instances
      .where((instance) => instance.instanceId == instanceId)
      .firstOrNull;

  ActivitiesState copyWith({
    String? Function()? chatUUID,
    int? subID,
    List<ActivityInstance>? instances,
    List<String>? participants,
    bool? readOnly,
    Map<String, String>? nativePlayers,
    bool? loading,
    String? Function()? error,
  }) => ActivitiesState(
    chatUUID: chatUUID != null ? chatUUID() : this.chatUUID,
    subID: subID ?? this.subID,
    instances: instances ?? this.instances,
    participants: participants ?? this.participants,
    readOnly: readOnly ?? this.readOnly,
    nativePlayers: nativePlayers ?? this.nativePlayers,
    loading: loading ?? this.loading,
    error: error != null ? error() : this.error,
  );
}

/// Owner of the activities of the voice room.
///
/// Holds the instances, the channel of the room and the `STREAM` of each
/// activity, and answers the SDK calls of the plugins. The server stays the
/// authority: the controller never invents a sequence number, a sender or a
/// version, and it re-reads the snapshot whenever the connection comes back
/// because the events published while it was down are not replayed.
class ActivityController extends Notifier<ActivitiesState> {
  /// Server-side cap: the fourth start is refused, so the UI never offers it.
  static const int maxActivities = 3;

  /// Server-side ceiling of a single `STATE` payload.
  static const int maxStateBytes = BridgeProtocol.maxStateBytes;

  /// Ceiling of a local storage key and of the whole storage of an activity.
  static const int maxStorageKeyBytes = 32 * 1024;
  static const int maxStorageTotalBytes = 256 * 1024;

  ActivityChannel? _channel;
  EventsListener<RoomEvent>? _roomListener;
  Room? _room;

  final Map<String, ActivityStream> _streams = {};
  final Map<String, Map<String, Object?>> _storage = {};
  final StreamController<ActivityCommand> _commands =
      StreamController<ActivityCommand>.broadcast();

  /// Mutations to push into the sandbox: the local acknowledgement and the
  /// publications of the room. The tile drops the sequence numbers it already
  /// knows, so the same mutation arriving twice reaches the plugin once.
  final StreamController<({String instanceId, ActivityEvent event})>
  _stateEvents =
      StreamController<({String instanceId, ActivityEvent event})>.broadcast();

  /// State mutations of every activity of the room.
  Stream<({String instanceId, ActivityEvent event})> get stateEvents =>
      _stateEvents.stream;

  /// Actions of the room, as their plugins have to see them.
  ///
  /// Transient by contract: an action is never replayed, so a tile that mounts
  /// later has missed a gesture, not a fact. The tile forwards each one to the
  /// sandbox of its instance.
  final StreamController<({String instanceId, Map<String, dynamic> payload})>
  _actionEvents =
      StreamController<
        ({String instanceId, Map<String, dynamic> payload})
      >.broadcast();

  Stream<({String instanceId, Map<String, dynamic> payload})>
  get actionEvents => _actionEvents.stream;

  /// The room as the native player of an activity has to follow it.
  ///
  /// A `file` is decoded by the app, so the plugin that owns the snapshot can
  /// only ask: the tile hands these to media_kit.
  final StreamController<({String instanceId, bool playing, double position})>
  _nativePlayerSync =
      StreamController<
        ({String instanceId, bool playing, double position})
      >.broadcast();

  Stream<({String instanceId, bool playing, double position})>
  get nativePlayerSync => _nativePlayerSync.stream;

  int _clockOffsetMs = 0;
  bool _left = false;

  /// The `leave` in flight, if any: see [leave].
  Future<void>? _pendingLeave;

  /// Commands the host UI must execute: fullscreen, restore, close.
  Stream<ActivityCommand> get commands => _commands.stream;

  /// Server time, estimated from the snapshot.
  int get serverNow => DateTime.now().millisecondsSinceEpoch + _clockOffsetMs;

  @override
  ActivitiesState build() {
    ref.onDispose(() {
      unawaited(leave());
      unawaited(_commands.close());
      unawaited(_stateEvents.close());
      unawaited(_actionEvents.close());
      unawaited(_nativePlayerSync.close());
    });

    ref.listen<CommsState>(commsProvider, (previous, next) {
      final chatUUID = state.chatUUID;
      if (chatUUID == null) return;

      if (!next.isRoomMatch(chatUUID, state.subID)) {
        // The call ended with the disconnect button, or the user joined
        // another one: the activities of this room die with it, even though
        // the page that hosted their tiles is still on screen.
        if (!next.connected && next.currentChatUUID == null) {
          unawaited(leave());
        }

        return;
      }

      final bound = _bindRoom();
      _refreshParticipants();

      final justConnected = previous == null || !previous.connected;
      if ((bound || justConnected) && state.instances.isEmpty) {
        unawaited(_resync());
      }
    });

    return const ActivitiesState();
  }

  /// Joins the room: snapshot first, subscription after.
  ///
  /// The order matters: the snapshot is also what proves to the server the
  /// client is in the room, so a stale tile of a dead room cannot appear.
  Future<void> join(String chatUUID, int sub) async {
    if (state.isRoom(chatUUID, sub) && _channel != null) return;

    await leave();

    _left = false;
    state = ActivitiesState(
      chatUUID: chatUUID,
      subID: sub,
      loading: true,
      readOnly: _isReadOnly(chatUUID, sub),
    );

    // The snapshot answers for a room the server can see, and the call is
    // connected only once the room exists.
    final ready = ref.read(commsProvider).isRoomMatch(chatUUID, sub);
    if (ready) await _resync();

    final channel = ActivityChannel(
      chatUUID: chatUUID,
      subID: sub,
      client: () => ref.read(socketServiceProvider).client,
      onEvent: _onPublication,
      onResynced: _resync,
    );

    _channel = channel;

    try {
      // Always once after the handshake
      await channel.subscribe(resync: true);
    } catch (error) {
      // The snapshot is already here: living without the channel is better
      // than a room that shows nothing, and the next reconnect resubscribes.
      debugPrint('Activity channel ${channel.name}: $error');
    }

    _bindRoom();
    _refreshParticipants();
  }

  /// Leaves the room and releases everything the tiles were using.
  ///
  /// Serialized: the call page is disposed and the next one joins in the same
  /// frame, and a second `leave` started while the first is still unsubscribing
  /// leaves the subscription in the registry of the connection.
  Future<void> leave() {
    final pending = _pendingLeave;
    if (pending != null) return pending;

    final future = _leave();
    _pendingLeave = future;

    return future.whenComplete(() {
      if (identical(_pendingLeave, future)) _pendingLeave = null;
    });
  }

  Future<void> _leave() async {
    _left = true;

    final channel = _channel;
    _channel = null;
    await channel?.dispose();

    for (final stream in _streams.values) {
      await stream.dispose();
    }
    _streams.clear();
    _storage.clear();

    _unbindRoom();

    if (state.chatUUID != null || state.instances.isNotEmpty) {
      state = const ActivitiesState();
    }
  }

  /// Human readable form of a failed call: the code says what happened, the
  /// message coming from the gateway says why.
  static String _describe(PluginApiException error) {
    return error.message.isEmpty
        ? error.code
        : '${error.code}: ${error.message}';
  }

  /// Starts a plugin in the room. The client sends the slug only.
  Future<ActivityInstance?> start(String slug) async {
    final chatUUID = state.chatUUID;
    if (chatUUID == null) return null;

    // One activity per plugin in a room: tapping a plugin that is already
    // running is a no-op that returns it, so the caller can close and go back
    // to the chat instead of starting a second, empty board.
    final running = state.instances
        .where((instance) => instance.slug == slug)
        .firstOrNull;

    if (running != null) return running;

    if (state.instances.length >= maxActivities) {
      state = state.copyWith(error: () => 'E_LIMIT');
      return null;
    }

    try {
      final instance = await apiGateway.plugins.activities.start(
        chatUUID,
        state.subID,
        slug,
      );

      _addInstance(instance);
      state = state.copyWith(error: () => null);

      return instance;
    } on PluginApiException catch (error) {
      state = state.copyWith(error: () => _describe(error));
      return null;
    }
  }

  /// Stops an activity. Any participant with the bit 9 can stop any of them.
  Future<void> stop(String instanceId) async {
    final chatUUID = state.chatUUID;
    if (chatUUID == null) return;

    try {
      await apiGateway.plugins.activities.stop(
        chatUUID,
        state.subID,
        instanceId,
      );
    } on PluginApiException catch (error) {
      state = state.copyWith(error: () => _describe(error));
      return;
    }

    _removeInstance(instanceId);
  }

  /// Closes the native player of an activity, if one is open.
  ///
  /// The sandbox is told by the tile, which owns the bridge: this only takes
  /// the player out of the tree, so it cannot be reopened by a rebuild.
  void closeNativePlayer(String instanceId) {
    if (!state.nativePlayers.containsKey(instanceId)) return;

    state = state.copyWith(
      nativePlayers: {
        for (final entry in state.nativePlayers.entries)
          if (entry.key != instanceId) entry.key: entry.value,
      },
    );
  }

  /// Appends a `STATE` mutation and returns the sequence number of the server.
  Future<({int seq, int ts})> sendState(
    String instanceId,
    String type,
    Object? data,
  ) async {
    final chatUUID = state.chatUUID;
    if (chatUUID == null) {
      throw const PluginApiException(0, 'E_NOT_IN_ROOM', 'The room is gone');
    }

    final size = utf8.encode(jsonEncode(data)).length;
    if (size > maxStateBytes) {
      throw const PluginApiException(
        413,
        'E_TOO_LARGE',
        'The state is too big',
      );
    }

    return apiGateway.plugins.activities.send(
      chatUUID,
      state.subID,
      instanceId,
      type,
      data,
    );
  }

  /// Publishes a transient `ACTION` on the room channel.
  Future<void> sendAction(String instanceId, String type, Object? data) async {
    if (_channel == null) {
      throw const PluginApiException(0, 'E_NOT_IN_ROOM', 'The room is gone');
    }

    final size = utf8.encode(jsonEncode(data)).length;
    if (size > BridgeProtocol.maxActionBytes) {
      throw const PluginApiException(
        413,
        'E_TOO_LARGE',
        'The action is too big',
      );
    }

    final sent = await _dispatchAction(instanceId, type, data);

    if (!sent) {
      throw const PluginApiException(0, 'E_NETWORK', 'The action was not sent');
    }
  }

  /// Publishes a `STREAM` packet on the LiveKit data channel of the activity.
  Future<void> sendStream(String instanceId, Uint8List bytes) async {
    final stream = _streams[instanceId];
    if (stream == null) {
      throw const PluginApiException(0, 'E_NOT_IN_ROOM', 'The room is gone');
    }

    await stream.send(bytes);
  }

  /// Identities of the participants, `userUUID_sessionID`.
  List<String> get participants => state.participants;

  /// Answers one SDK call of a plugin.
  ///
  /// Every branch that writes checks the local view of the permissions, and
  /// the server checks them again: the local check only spares the plugin a
  /// round trip, it is not what makes the call safe.
  Future<BridgeReply> handleRequest(
    String instanceId,
    BridgeRequest request,
  ) async {
    try {
      switch (request.method) {
        case 'init':
          final instance = state.byId(instanceId);
          if (instance == null) {
            return BridgeReply.failure(request.id, 'E_FORBIDDEN', 'Gone');
          }
          return BridgeReply.success(request.id, _initPayload(instance));

        case 'state.send':
          if (state.readOnly) {
            return BridgeReply.failure(request.id, 'E_FORBIDDEN', 'Read only');
          }

          final sender = state.byId(instanceId);
          if (sender == null) {
            return BridgeReply.failure(request.id, 'E_FORBIDDEN', 'Gone');
          }

          if (!sender.bundle.allowsChannel('state')) {
            return BridgeReply.failure(
              request.id,
              'E_CAPABILITY',
              'The plugin did not declare the state channel',
            );
          }

          final type = request.string('type');
          if (type == null || type.isEmpty) {
            return BridgeReply.failure(request.id, 'E_INTERNAL', 'No type');
          }

          final data = request.value('data');
          final ack = await sendState(instanceId, type, data);

          // Local echo: the plugin that wrote the state learns its sequence
          // number and applies it exactly like a remote mutation.
          _publishState(
            instanceId,
            ActivityEvent(
              seq: ack.seq,
              sender: _selfIdentity(),
              ts: ack.ts,
              type: type,
              data: data,
            ),
          );

          return BridgeReply.success(request.id, {
            'seq': ack.seq,
            'ts': ack.ts,
          });

        case 'action.send':
          if (state.readOnly) {
            return BridgeReply.failure(request.id, 'E_FORBIDDEN', 'Read only');
          }

          final type = request.string('type');
          if (type == null || type.isEmpty) {
            return BridgeReply.failure(request.id, 'E_INTERNAL', 'No type');
          }

          final sender = state.byId(instanceId);
          if (sender == null) {
            return BridgeReply.failure(request.id, 'E_FORBIDDEN', 'Gone');
          }

          if (!sender.bundle.allowsChannel('action')) {
            return BridgeReply.failure(
              request.id,
              'E_CAPABILITY',
              'The plugin did not declare the action channel',
            );
          }

          await sendAction(instanceId, type, request.value('data'));
          return BridgeReply.success(request.id, null);

        case 'stream.send':
          final instance = state.byId(instanceId);
          if (instance == null) {
            return BridgeReply.failure(request.id, 'E_FORBIDDEN', 'Gone');
          }

          if (!instance.bundle.allows('stream')) {
            return BridgeReply.failure(
              request.id,
              'E_CAPABILITY',
              'The plugin did not declare the stream capability',
            );
          }

          if (!instance.bundle.allowsChannel('stream')) {
            return BridgeReply.failure(
              request.id,
              'E_CAPABILITY',
              'The plugin did not declare the stream channel',
            );
          }

          if (state.readOnly) {
            return BridgeReply.failure(request.id, 'E_FORBIDDEN', 'Read only');
          }

          final encoded = request.string('data');
          if (encoded == null) {
            return BridgeReply.failure(request.id, 'E_INTERNAL', 'No data');
          }

          final bytes = base64Decode(encoded);
          if (bytes.length > BridgeProtocol.maxStreamBytes) {
            return BridgeReply.failure(request.id, 'E_TOO_LARGE', 'Too big');
          }

          await sendStream(instanceId, bytes);
          return BridgeReply.success(request.id, null);

        case 'player.open':
          final instance = state.byId(instanceId);
          if (instance == null) {
            return BridgeReply.failure(request.id, 'E_FORBIDDEN', 'Gone');
          }

          final url = _nativeVideoUrl(request.string('url'));
          if (url == null) {
            return BridgeReply.failure(
              request.id,
              'E_UNSUPPORTED',
              'The player accepts an http(s) video url',
            );
          }

          state = state.copyWith(
            nativePlayers: {...state.nativePlayers, instanceId: url},
          );

          return BridgeReply.success(request.id, null);

        case 'player.close':
          closeNativePlayer(instanceId);
          return BridgeReply.success(request.id, null);

        case 'player.sync':
          if (state.byId(instanceId) == null) {
            return BridgeReply.failure(request.id, 'E_FORBIDDEN', 'Gone');
          }

          final position = request.value('position');
          if (position is! num) {
            return BridgeReply.failure(request.id, 'E_INTERNAL', 'No position');
          }

          if (!_nativePlayerSync.isClosed) {
            _nativePlayerSync.add((
              instanceId: instanceId,
              playing: request.value('playing') == true,
              position: position.toDouble(),
            ));
          }

          return BridgeReply.success(request.id, null);

        case 'users.get':
          final uuid = request.string('uuid');
          return BridgeReply.success(
            request.id,
            uuid == null ? null : _userName(uuid),
          );

        case 'storage.get':
          return BridgeReply.success(
            request.id,
            _storageOf(instanceId)[request.string('key') ?? ''],
          );

        case 'storage.set':
          return _storeValue(instanceId, request);

        case 'storage.delete':
          _storageOf(instanceId).remove(request.string('key') ?? '');
          return BridgeReply.success(request.id, null);

        case 'ui.fullscreen':
          _commands.add(
            ActivityCommand(instanceId, ActivityCommandKind.fullscreen),
          );
          return BridgeReply.success(request.id, null);

        case 'ui.restore':
          _commands.add(
            ActivityCommand(instanceId, ActivityCommandKind.restore),
          );
          return BridgeReply.success(request.id, null);

        case 'ui.close':
          _commands.add(ActivityCommand(instanceId, ActivityCommandKind.close));
          return BridgeReply.success(request.id, null);

        case 'log':
          debugPrint('[plugin $instanceId] ${request.value('args')}');
          return BridgeReply.success(request.id, null);

        default:
          return BridgeReply.failure(
            request.id,
            'E_INTERNAL',
            'Unknown method ${request.method}',
          );
      }
    } on PluginApiException catch (error) {
      debugPrint(
        '[ActivityController] ${request.method} refused: '
        '${error.code} ${error.message}',
      );

      return BridgeReply.failure(request.id, error.code, error.message);
    } on PluginCacheException catch (error) {
      return BridgeReply.failure(request.id, error.code, error.message);
    } on FormatException catch (error) {
      return BridgeReply.failure(request.id, 'E_INTERNAL', error.message);
    } catch (error) {
      debugPrint('[ActivityController] ${request.method} failed: $error');

      return BridgeReply.failure(request.id, 'E_INTERNAL', '$error');
    }
  }

  /// Only a remote `http(s)` url: the native player is libmpv, and a path of
  /// the device is not something a plugin may ask the app to open.
  String? _nativeVideoUrl(String? raw) {
    final uri = raw == null ? null : Uri.tryParse(raw.trim());
    if (uri == null) return null;
    if (uri.scheme != 'https' && uri.scheme != 'http') return null;
    if (uri.host.isEmpty) return null;

    return uri.toString();
  }

  BridgeReply _storeValue(String instanceId, BridgeRequest request) {
    final key = request.string('key');
    if (key == null || key.isEmpty) {
      return BridgeReply.failure(request.id, 'E_INTERNAL', 'No key');
    }

    final encoded = jsonEncode(request.value('value'));
    if (utf8.encode(key).length > maxStorageKeyBytes) {
      return BridgeReply.failure(request.id, 'E_TOO_LARGE', 'Key too big');
    }

    final storage = _storageOf(instanceId);
    final current = storage.values.fold<int>(
      0,
      (total, value) => total + utf8.encode(jsonEncode(value)).length,
    );

    if (current + utf8.encode(encoded).length > maxStorageTotalBytes) {
      return BridgeReply.failure(request.id, 'E_TOO_LARGE', 'Storage full');
    }

    storage[key] = request.value('value');

    return BridgeReply.success(request.id, null);
  }

  /// Storage namespaced by `<slug>:<instanceId>`, dropped when the room ends.
  Map<String, Object?> _storageOf(String instanceId) =>
      _storage.putIfAbsent(instanceId, () => <String, Object?>{});

  Map<String, Object?>? _userName(String uuid) {
    try {
      final user = ref.read(userStoreProvider.notifier).getUser(uuid);
      if (user == null) return null;

      return {'uuid': uuid, 'name': user.name, 'surname': user.surname};
    } catch (_) {
      return null;
    }
  }

  Map<String, Object?> _initPayload(ActivityInstance instance) {
    final self = _selfIdentity();

    return {
      'instanceId': instance.instanceId,
      'plugin': {'slug': instance.slug, 'version': instance.version},
      'room': {'chatUUID': state.chatUUID, 'subID': state.subID},
      'self': self,
      'participants': state.participants,
      'serverNow': serverNow,
      'readOnly': state.readOnly,
      'capabilities': instance.bundle.capabilities,
      'locale': _localeTag(),
      'theme': _themeMode(),
      'state': {
        'seq': instance.seq,
        'truncated': instance.truncated,
        'events': instance.events.map((event) => event.toJson()).toList(),
      },
    };
  }

  /// The language of the app, as a plugin receives it in `init()`.
  ///
  /// The setting wins over the system locale, exactly like the `MaterialApp`;
  /// a client without settings falls back to the platform.
  String _localeTag() {
    try {
      final code = ref.read(settingsControllerProvider)['locale.appLanguage'];
      if (code is String && code.isNotEmpty) return code;
    } catch (_) {
      // No settings scope (tests, early start): the platform is enough.
    }

    return PlatformDispatcher.instance.locale.toLanguageTag();
  }

  /// The theme the app is drawn in, as a plugin receives it in `init()`.
  ///
  /// `system` is resolved here, so a plugin never has to guess.
  String _themeMode() {
    try {
      final mode = themeModeFromSetting(
        ref.read(settingsControllerProvider)['appearance.themeMode'],
      );

      final dark = switch (mode) {
        ThemeMode.dark => true,
        ThemeMode.light => false,
        ThemeMode.system =>
          PlatformDispatcher.instance.platformBrightness == Brightness.dark,
      };

      return dark ? 'dark' : 'light';
    } catch (_) {
      return 'light';
    }
  }

  String _selfIdentity() {
    final identity = _room?.localParticipant?.identity;
    if (identity != null && identity.isNotEmpty) return identity;

    return _selfUserUUID() ?? '';
  }

  String? _selfUserUUID() {
    try {
      return AppDatabase.instance.currentUserUUID;
    } catch (_) {
      return null;
    }
  }

  bool _isReadOnly(String chatUUID, int sub) {
    try {
      final chat = ref
          .read(chatListProvider)
          .chats
          .where((candidate) => candidate.uuid == chatUUID)
          .firstOrNull;

      if (chat == null) return false;

      final userUUID = _selfUserUUID();
      if (userUUID == null || userUUID.isEmpty) return false;

      return !ChatPermissionHelpers.canUserPerform(
        chat,
        userUUID,
        ChatPermissions.useActivities,
        subID: sub,
      );
    } catch (_) {
      // Unknown permissions are not a reason to lock the user out: the server
      // refuses the writes anyway.
      return false;
    }
  }

  /// Re-reads the snapshot of the room.
  Future<void> _resync() async {
    final chatUUID = state.chatUUID;
    if (chatUUID == null || _left) return;

    try {
      final snapshot = await apiGateway.plugins.activities.snapshot(
        chatUUID,
        state.subID,
      );

      if (_left || !state.isRoom(chatUUID, state.subID)) return;

      _clockOffsetMs = snapshot.serverNow == 0
          ? 0
          : snapshot.serverNow - DateTime.now().millisecondsSinceEpoch;

      _replaceInstances(snapshot.activities);
      state = state.copyWith(loading: false, error: () => null);
    } on PluginApiException catch (error) {
      state = state.copyWith(loading: false, error: () => _describe(error));
    } catch (error) {
      debugPrint('[ActivityController] snapshot failed: $error');
      state = state.copyWith(loading: false, error: () => '$error');
    }
  }

  void _replaceInstances(List<ActivityInstance> instances) {
    final keep = instances.map((instance) => instance.instanceId).toSet();

    for (final instanceId in _streams.keys.toList()) {
      if (keep.contains(instanceId)) continue;

      _streams.remove(instanceId)?.dispose();
      _storage.remove(instanceId);
    }

    for (final instance in instances) {
      _bindStream(instance);
    }

    state = state.copyWith(
      instances: instances,
      nativePlayers: {
        for (final entry in state.nativePlayers.entries)
          if (keep.contains(entry.key)) entry.key: entry.value,
      },
    );
  }

  void _addInstance(ActivityInstance instance) {
    final existing = state.instances
        .where((candidate) => candidate.instanceId == instance.instanceId)
        .firstOrNull;

    if (existing != null) {
      _replaceInstance(instance.instanceId, (_) => instance);
      return;
    }

    _bindStream(instance);
    state = state.copyWith(instances: [...state.instances, instance]);
  }

  void _removeInstance(String instanceId) {
    _streams.remove(instanceId)?.dispose();
    _storage.remove(instanceId);

    state = state.copyWith(
      instances: state.instances
          .where((instance) => instance.instanceId != instanceId)
          .toList(),
      nativePlayers: {
        for (final entry in state.nativePlayers.entries)
          if (entry.key != instanceId) entry.key: entry.value,
      },
    );
  }

  void _replaceInstance(
    String instanceId,
    ActivityInstance Function(ActivityInstance) update,
  ) {
    state = state.copyWith(
      instances: [
        for (final instance in state.instances)
          if (instance.instanceId == instanceId) update(instance) else instance,
      ],
    );
  }

  void _bindStream(ActivityInstance instance) {
    _streams.remove(instance.instanceId)?.dispose();

    final stream = ActivityStream(
      instanceId: instance.instanceId,
      room: () => _room,
      onPacket: (sender, bytes) {
        // The tiles bridge the packet to their plugin: the payload stays
        // opaque here, the host only routes it.
        _packets.add((
          instanceId: instance.instanceId,
          sender: sender,
          bytes: bytes,
        ));
      },
      onAction: (sender, bytes) {
        // An action of the room, on the control topic of the activity. The
        // envelope is the one the gateway would have carried.
        final payload = _decodeAction(bytes);
        if (payload == null) return;

        _onPublication('activity:action', payload);
      },
    );

    _streams[instance.instanceId] = stream;
    stream.bind();
  }

  final StreamController<({String instanceId, String sender, Uint8List bytes})>
  _packets =
      StreamController<
        ({String instanceId, String sender, Uint8List bytes})
      >.broadcast();

  /// Packets of the `STREAM` channel, per activity.
  Stream<({String instanceId, String sender, Uint8List bytes})> get packets =>
      _packets.stream;

  void _onPublication(String event, Map<String, dynamic> payload) {
    if (_left) return;

    switch (event) {
      case 'activity:started':
        final instance = ActivityInstance.fromJson(payload);
        if (instance.instanceId.isEmpty) return;

        // The server refuses a second activity of the same plugin; a client
        // that missed the refusal still must not show two of them.
        if (state.instances.any(
          (candidate) => candidate.slug == instance.slug,
        )) {
          return;
        }

        _addInstance(instance);

      case 'activity:state':
        final instanceId = payload['instanceId']?.toString();
        if (instanceId == null) return;

        final mutation = ActivityEvent.fromJson(payload);
        if (mutation.seq == 0) return;

        _replaceInstance(instanceId, (current) => current.withEvent(mutation));
        _publishState(instanceId, mutation);

      case 'activity:action':
        final instanceId = payload['instanceId']?.toString();
        if (instanceId == null) return;

        if (!_actionEvents.isClosed) {
          _actionEvents.add((instanceId: instanceId, payload: payload));
        }

      case 'activity:stopped':
        final instanceId = payload['instanceId']?.toString();
        if (instanceId == null) return;
        _removeInstance(instanceId);
    }
  }

  /// Publishes one action on the data channel of its activity.
  ///
  /// The gateway refuses a publication a client makes on the channel of the
  /// room (`the activity does not match the channel`), so the action channel
  /// cannot use it — and does not need to: an action is transient by contract,
  /// and the LiveKit data channel of the activity reaches exactly the people in
  /// the call, without a server in the middle and without being replayed. The
  /// envelope is unchanged, so the plugin sees the same event.
  ///
  /// The local copy is handed to the plugin before the packet leaves: a LiveKit
  /// packet is not echoed to its author, and a player owned by this client has
  /// to react to its own gesture.
  Future<bool> _dispatchAction(
    String instanceId,
    String type,
    Object? data,
  ) async {
    final stream = _streams[instanceId];
    if (stream == null) return false;

    final sender = _selfIdentity();

    final payload = <String, dynamic>{
      'instanceId': instanceId,
      'type': type,
      'sender': sender,
      'data': ?data,
    };

    if (!_actionEvents.isClosed) {
      _actionEvents.add((instanceId: instanceId, payload: payload));
    }

    try {
      await stream.publishAction(
        utf8.encode(
          jsonEncode({'event': 'activity:action', 'payload': payload}),
        ),
      );
      return true;
    } on PluginCacheException catch (error) {
      debugPrint('Activity action $instanceId: ${error.code}');
      return false;
    } catch (error) {
      debugPrint('Activity action $instanceId failed: $error');
      return false;
    }
  }

  /// Reads the envelope of an action arriving on the data channel.
  Map<String, dynamic>? _decodeAction(Uint8List bytes) {
    try {
      final envelope = BridgeProtocol.decodeMap(
        utf8.decode(bytes, allowMalformed: true),
      );

      if (envelope == null ||
          envelope['event']?.toString() != 'activity:action') {
        return null;
      }

      final payload = envelope['payload'];
      if (payload is! Map) return null;

      return Map<String, dynamic>.from(payload);
    } on FormatException {
      return null;
    }
  }

  /// Hands one mutation to the tiles, which forward it to their sandbox.
  void _publishState(String instanceId, ActivityEvent event) {
    if (_stateEvents.isClosed) return;

    _stateEvents.add((instanceId: instanceId, event: event));
  }

  /// Binds the LiveKit room of the call; true when the room is a new one.
  bool _bindRoom() {
    final room = ref.read(commsProvider).room;
    if (identical(room, _room)) return false;

    _unbindRoom();
    _room = room;
    if (room == null) return false;

    _roomListener = room.createListener()
      ..on<ParticipantConnectedEvent>((_) => _refreshParticipants())
      ..on<ParticipantDisconnectedEvent>((_) => _refreshParticipants());

    for (final stream in _streams.values) {
      stream.bind();
    }

    return true;
  }

  void _unbindRoom() {
    try {
      _roomListener?.dispose();
    } catch (_) {}

    _roomListener = null;
    _room = null;
  }

  void _refreshParticipants() {
    if (_left) return;

    final room = _room;
    if (room == null) return;

    final identities = <String>[
      if (room.localParticipant?.identity != null)
        room.localParticipant!.identity,
      for (final participant in room.remoteParticipants.values)
        participant.identity,
    ];

    if (listEquals(identities, state.participants)) return;

    state = state.copyWith(participants: identities);
  }
}

/// A command the plugin asked the host to execute.
enum ActivityCommandKind { fullscreen, restore, close }

/// One command, addressed to the activity that requested it.
@immutable
class ActivityCommand {
  const ActivityCommand(this.instanceId, this.kind);

  final String instanceId;
  final ActivityCommandKind kind;
}

/// The activities of the voice room.
final activityControllerProvider =
    NotifierProvider<ActivityController, ActivitiesState>(
      ActivityController.new,
    );
