import 'package:dio/dio.dart';
import 'package:novyse/core/plugins/models/activity_instance.dart';
import 'package:novyse/core/plugins/models/plugin_entry.dart';
import 'package:novyse/core/plugins/plugin_exception.dart';

import '../api_response.dart';

/// Plugin registry and activity endpoints.
class PluginsModule {
  final PluginRegistryModule registry;
  final PluginActivityModule activities;

  PluginsModule(Dio dio)
    : registry = PluginRegistryModule(dio),
      activities = PluginActivityModule(dio);
}

/// `GET /plugins` and `GET /plugins/{slug}`.
class PluginRegistryModule {
  final Dio _dio;
  PluginRegistryModule(this._dio);

  /// The whole library: name of the collection and every published plugin.
  Future<({String? library, List<PluginEntry> plugins})> list() async {
    try {
      final res = await _dio.get('/plugins');
      if (!isOk(res)) {
        return (library: null, plugins: const <PluginEntry>[]);
      }

      final data = responseData(res);
      final plugins = data is Map && data['plugins'] is List
          ? (data['plugins'] as List)
                .whereType<Map<String, dynamic>>()
                .map(PluginEntry.fromJson)
                .toList()
          : const <PluginEntry>[];

      return (
        library: data is Map ? data['library']?.toString() : null,
        plugins: plugins,
      );
    } on DioException catch (error) {
      throw PluginApiException.fromDio(error);
    }
  }

  /// A single plugin, never cached: this is the launch-time update check.
  ///
  /// Throws [PluginApiException] with `E_UNAVAILABLE` when the slug is gone.
  Future<PluginEntry> get(String slug) async {
    try {
      final res = await _dio.get('/plugins/$slug');
      final data = responseData(res);

      if (!isOk(res) || data is! Map<String, dynamic>) {
        throw PluginApiException(
          res.statusCode ?? 0,
          'E_UNAVAILABLE',
          'Plugin $slug is not in the registry',
        );
      }

      return PluginEntry.fromJson(data);
    } on DioException catch (error) {
      throw PluginApiException.fromDio(error);
    }
  }
}

/// `/comms/activities`: the lifecycle of the activities of a voice room.
class PluginActivityModule {
  final Dio _dio;
  PluginActivityModule(this._dio);

  /// The running activities of the room with their event log.
  ///
  /// This is the call a client makes on join, before subscribing: it also
  /// tells the server the room is alive, so zombie tiles cannot appear.
  Future<({int serverNow, List<ActivityInstance> activities})> snapshot(
    String chatUUID,
    int sub,
  ) async {
    try {
      final res = await _dio.get(
        '/comms/activities',
        queryParameters: {'chatUUID': chatUUID, 'subID': sub},
      );

      if (!isOk(res)) {
        return (serverNow: 0, activities: const <ActivityInstance>[]);
      }

      final data = responseData(res);
      final activities = data is Map && data['activities'] is List
          ? (data['activities'] as List)
                .whereType<Map<String, dynamic>>()
                .map(ActivityInstance.fromJson)
                .toList()
          : const <ActivityInstance>[];

      return (
        serverNow: data is Map ? (data['serverNow'] as num?)?.toInt() ?? 0 : 0,
        activities: activities,
      );
    } on DioException catch (error) {
      throw PluginApiException.fromDio(error);
    }
  }

  /// Starts a plugin in the room and returns the pinned instance.
  ///
  /// The client sends the slug only: the version, the bundle and the URLs are
  /// chosen server-side, so a client cannot start an arbitrary build.
  Future<ActivityInstance> start(String chatUUID, int sub, String slug) async {
    try {
      final res = await _dio.post(
        '/comms/activities/start',
        data: {'chatUUID': chatUUID, 'subID': sub.toString(), 'slug': slug},
      );

      final data = responseData(res);
      if (!isOk(res) || data is! Map<String, dynamic>) {
        throw PluginApiException(
          res.statusCode ?? 0,
          'E_INTERNAL',
          'The activity did not start',
        );
      }

      return ActivityInstance.fromJson(data);
    } on DioException catch (error) {
      throw PluginApiException.fromDio(error);
    }
  }

  /// Appends a `STATE` mutation and returns the sequence number assigned.
  Future<({int seq, int ts})> send(
    String chatUUID,
    int sub,
    String instanceId,
    String type,
    Object? data,
  ) async {
    try {
      final res = await _dio.post(
        '/comms/activities/event',
        data: {
          'chatUUID': chatUUID,
          'subID': sub.toString(),
          'instanceId': instanceId,
          'type': type,
          'data': ?data,
        },
      );

      final payload = responseData(res);
      if (!isOk(res) || payload is! Map) {
        throw PluginApiException(
          res.statusCode ?? 0,
          'E_INTERNAL',
          'The event was not stored',
        );
      }

      return (
        seq: (payload['seq'] as num?)?.toInt() ?? 0,
        ts: (payload['ts'] as num?)?.toInt() ?? 0,
      );
    } on DioException catch (error) {
      throw PluginApiException.fromDio(error);
    }
  }

  /// Stops an activity. Any participant with the bit 9 can stop any activity.
  Future<void> stop(String chatUUID, int sub, String instanceId) async {
    try {
      await _dio.post(
        '/comms/activities/stop',
        data: {
          'chatUUID': chatUUID,
          'subID': sub.toString(),
          'instanceId': instanceId,
        },
      );
    } on DioException catch (error) {
      final status = error.response?.statusCode;
      // Stopping an activity that is already gone is not a failure.
      if (status == 404) return;
      throw PluginApiException.fromDio(error);
    }
  }
}
