import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
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
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';

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
    bool? loading,
    String? Function()? error,
  }) => ActivitiesState(
    chatUUID: chatUUID != null ? chatUUID() : this.chatUUID,
    subID: subID ?? this.subID,
    instances: instances ?? this.instances,
    participants: participants ?? this.participants,
    readOnly: readOnly ?? this.readOnly,
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

  int _clockOffsetMs = 0;
  bool _left = false;

  /// Commands the host UI must execute: fullscreen, restore, close.
  Stream<ActivityCommand> get commands => _commands.stream;

  /// Server time, estimated from the snapshot.
  int get serverNow => DateTime.now().millisecondsSinceEpoch + _clockOffsetMs;

  @override
  ActivitiesState build() {
    ref.onDispose(() {
      unawaited(leave());
      unawaited(_commands.close());
    });

    ref.listen<CommsState>(commsProvider, (previous, next) {
      if (state.chatUUID == null) return;
      if (!next.isRoomMatch(state.chatUUID!, state.subID)) return;

      _bindRoom();
      _refreshParticipants();
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

    await _resync();

    final channel = ActivityChannel(
      chatUUID: chatUUID,
      subID: sub,
      client: () => ref.read(socketServiceProvider).client,
      onEvent: _onPublication,
      onResynced: _resync,
    );

    _channel = channel;
    await channel.subscribe();

    _bindRoom();
    _refreshParticipants();
  }

  /// Leaves the room and releases everything the tiles were using.
  Future<void> leave() async {
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

  /// Starts a plugin in the room. The client sends the slug only.
  Future<ActivityInstance?> start(String slug) async {
    final chatUUID = state.chatUUID;
    if (chatUUID == null) return null;

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
      state = state.copyWith(error: () => error.code);
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
      state = state.copyWith(error: () => error.code);
      return;
    }

    _removeInstance(instanceId);
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
    final channel = _channel;
    if (channel == null) {
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

    final sent = await channel.publishAction(
      instanceId: instanceId,
      type: type,
      data: data,
    );

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

          final type = request.string('type');
          if (type == null || type.isEmpty) {
            return BridgeReply.failure(request.id, 'E_INTERNAL', 'No type');
          }

          final ack = await sendState(instanceId, type, request.value('data'));
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
      return BridgeReply.failure(request.id, error.code, error.message);
    } on PluginCacheException catch (error) {
      return BridgeReply.failure(request.id, error.code, error.message);
    } on FormatException catch (error) {
      return BridgeReply.failure(request.id, 'E_INTERNAL', error.message);
    } catch (error) {
      return BridgeReply.failure(request.id, 'E_INTERNAL', '$error');
    }
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
      'state': {
        'seq': instance.seq,
        'truncated': instance.truncated,
        'events': instance.events.map((event) => event.toJson()).toList(),
      },
    };
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
      state = state.copyWith(loading: false, error: () => error.code);
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

    state = state.copyWith(instances: instances);
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
        _addInstance(instance);

      case 'activity:state':
        final instanceId = payload['instanceId']?.toString();
        if (instanceId == null) return;

        final mutation = ActivityEvent.fromJson(payload);
        if (mutation.seq == 0) return;

        _replaceInstance(instanceId, (current) => current.withEvent(mutation));

      case 'activity:stopped':
        final instanceId = payload['instanceId']?.toString();
        if (instanceId == null) return;
        _removeInstance(instanceId);
    }
  }

  void _bindRoom() {
    final room = ref.read(commsProvider).room;
    if (identical(room, _room)) return;

    _unbindRoom();
    _room = room;
    if (room == null) return;

    _roomListener = room.createListener()
      ..on<ParticipantConnectedEvent>((_) => _refreshParticipants())
      ..on<ParticipantDisconnectedEvent>((_) => _refreshParticipants());

    for (final stream in _streams.values) {
      stream.bind();
    }
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
