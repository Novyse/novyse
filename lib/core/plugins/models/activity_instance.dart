import 'package:flutter/foundation.dart';
import 'package:novyse/core/plugins/models/activity_event.dart';
import 'package:novyse/core/plugins/models/plugin_entry.dart';

/// A running activity of a voice room, as served by the snapshot and by the
/// start of an activity.
///
/// The instance pins the build of the plugin (`version` + `bundle`): every
/// participant mounts that one, even when the registry has moved on.
@immutable
class ActivityInstance {
  const ActivityInstance({
    required this.instanceId,
    required this.slug,
    required this.version,
    required this.startedBy,
    required this.startedAt,
    required this.seq,
    required this.truncated,
    required this.bundle,
    required this.events,
  });

  /// Identifier of the activity inside the room.
  final String instanceId;

  /// Identifier of the plugin.
  final String slug;

  /// Version pinned at start.
  final String version;

  /// Identity of the participant that started the activity.
  final String startedBy;

  /// Start time in milliseconds, from the server clock.
  final int startedAt;

  /// Last sequence number assigned to the activity.
  final int seq;

  /// True when the oldest events may have been trimmed: the plugin must
  /// rebuild from the surviving tail instead of assuming a full log.
  final bool truncated;

  /// The build the room is running.
  final PluginBundle bundle;

  /// Event log, oldest first.
  final List<ActivityEvent> events;

  factory ActivityInstance.fromJson(Map<String, dynamic> json) {
    final bundle = json['bundle'];
    final events = json['events'];

    return ActivityInstance(
      instanceId: json['instanceId']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      version: json['version']?.toString() ?? '',
      startedBy: json['startedBy']?.toString() ?? '',
      startedAt: (json['startedAt'] as num?)?.toInt() ?? 0,
      seq: (json['seq'] as num?)?.toInt() ?? 0,
      truncated: json['truncated'] == true,
      bundle: bundle is Map<String, dynamic>
          ? PluginBundle.fromJson(bundle)
          : const PluginBundle(
              downloadUrl: '',
              entryUrl: '',
              sha256: '',
              sizeBytes: 0,
              capabilities: [],
            ),
      events: events is List
          ? events
                .whereType<Map<String, dynamic>>()
                .map(ActivityEvent.fromJson)
                .toList()
          : const [],
    );
  }

  /// The build key used by the cache and by the bridge.
  String get buildKey => '$slug@$version';

  ActivityInstance copyWith({
    int? seq,
    bool? truncated,
    List<ActivityEvent>? events,
  }) => ActivityInstance(
    instanceId: instanceId,
    slug: slug,
    version: version,
    startedBy: startedBy,
    startedAt: startedAt,
    seq: seq ?? this.seq,
    truncated: truncated ?? this.truncated,
    bundle: bundle,
    events: events ?? this.events,
  );

  /// Appends [event], ignoring the ones already in the log.
  ///
  /// Both the echo of a local mutation and a live event can arrive after the
  /// snapshot that already contains them: the sequence number is the
  /// authority, so a duplicate is a no-op instead of a double apply.
  ActivityInstance withEvent(ActivityEvent event) {
    if (events.isNotEmpty && event.seq <= events.last.seq) {
      final known = events.any((candidate) => candidate.seq == event.seq);
      if (known) return this;
    }

    final next = [...events, event];

    return copyWith(seq: event.seq > seq ? event.seq : seq, events: next);
  }
}
