import 'package:flutter/foundation.dart';

/// One plugin of the official library, as served by `GET /plugins`.
///
/// The URLs are absolute and built by the gateway: the client never composes
/// a GitHub URL itself, so the repository, the tag and the asset naming can
/// change without a client release.
@immutable
class PluginEntry {
  const PluginEntry({
    required this.slug,
    required this.name,
    required this.description,
    required this.version,
    required this.tag,
    required this.iconUrl,
    required this.downloadUrl,
    required this.entryUrl,
    required this.sha256,
    required this.sizeBytes,
    required this.minAppVersion,
    required this.capabilities,
  });

  /// Identifier of the plugin, `[a-z0-9-]`, at most 64 chars.
  final String slug;

  /// Display name shown in the store and on the tile.
  final String name;

  /// Short description shown in the store.
  final String description;

  /// Published version, the semver of the release.
  final String version;

  /// Git tag of the release (`<slug>@<version>`).
  final String tag;

  /// Absolute URL of the icon, empty when the plugin has none.
  final String iconUrl;

  /// Absolute URL of the bundle archive (`.zip`).
  final String downloadUrl;

  /// Absolute URL of the self-contained `index.html`.
  final String entryUrl;

  /// SHA-256 of the archive, lowercase hex.
  final String sha256;

  /// Size of the archive in bytes, `0` when unknown.
  final int sizeBytes;

  /// Minimum client version that can run the plugin, empty when unbounded.
  final String minAppVersion;

  /// Capabilities granted to the plugin, from the registry.
  final List<String> capabilities;

  factory PluginEntry.fromJson(Map<String, dynamic> json) {
    final capabilities = json['capabilities'];

    return PluginEntry(
      slug: json['slug']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      version: json['version']?.toString() ?? '',
      tag: json['tag']?.toString() ?? '',
      iconUrl: json['iconUrl']?.toString() ?? '',
      downloadUrl: json['downloadUrl']?.toString() ?? '',
      entryUrl: json['entryUrl']?.toString() ?? '',
      sha256: json['sha256']?.toString().toLowerCase() ?? '',
      sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
      minAppVersion: json['minAppVersion']?.toString() ?? '',
      capabilities: capabilities is List
          ? capabilities.map((entry) => entry.toString()).toList()
          : const [],
    );
  }

  /// The build this entry points at, pinned into an activity instance.
  PluginBundle get bundle => PluginBundle(
    downloadUrl: downloadUrl,
    entryUrl: entryUrl,
    sha256: sha256,
    sizeBytes: sizeBytes,
    capabilities: capabilities,
  );

  /// True when the entry carries everything needed to install the build.
  bool get hasBundle => downloadUrl.isNotEmpty && entryUrl.isNotEmpty;

  /// True when [appVersion] is new enough to run the plugin.
  ///
  /// An empty `minAppVersion` never blocks: the registry omits it when the
  /// plugin works with every client.
  bool isCompatibleWith(String appVersion) =>
      minAppVersion.isEmpty || compareVersions(appVersion, minAppVersion) >= 0;
}

/// The build of a plugin pinned by an activity.
///
/// The URLs come from the snapshot of the room, so a late joiner downloads
/// the version the room is running even after the registry moved on.
@immutable
class PluginBundle {
  const PluginBundle({
    required this.downloadUrl,
    required this.entryUrl,
    required this.sha256,
    required this.sizeBytes,
    required this.capabilities,
  });

  final String downloadUrl;
  final String entryUrl;
  final String sha256;
  final int sizeBytes;
  final List<String> capabilities;

  factory PluginBundle.fromJson(Map<String, dynamic> json) {
    final capabilities = json['capabilities'];

    return PluginBundle(
      downloadUrl: json['downloadUrl']?.toString() ?? '',
      entryUrl: json['entryUrl']?.toString() ?? '',
      sha256: json['sha256']?.toString().toLowerCase() ?? '',
      sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
      capabilities: capabilities is List
          ? capabilities.map((entry) => entry.toString()).toList()
          : const [],
    );
  }

  /// True when the descriptor cannot install anything.
  bool get isEmpty => downloadUrl.isEmpty && entryUrl.isEmpty;

  /// True when the plugin declares [capability].
  bool allows(String capability) => capabilities.contains(capability);
}

/// Compares two `MAJOR.MINOR.PATCH[-YYYYMMDD.BUILD]` versions.
///
/// A negative result means [a] is older, a positive one that it is newer and
/// zero that they are equal. The format is the one the client sends in the
/// `X-App-Version` header, so the comparison here matches the server side.
int compareVersions(String a, String b) {
  final left = _ParsedVersion.parse(a);
  final right = _ParsedVersion.parse(b);

  for (var index = 0; index < _ParsedVersion.fieldCount; index++) {
    final difference = left.field(index) - right.field(index);
    if (difference != 0) return difference;
  }

  return 0;
}

/// The numeric fields of a version: major, minor, patch, date and build.
class _ParsedVersion {
  _ParsedVersion(this.values);

  static const int fieldCount = 5;

  final List<int> values;

  int field(int index) => index < values.length ? values[index] : 0;

  /// Parses `MAJOR.MINOR.PATCH` and the optional `-YYYYMMDD.BUILD` suffix.
  ///
  /// Anything unparsable collapses to zero: a malformed version never blocks
  /// a client, it only loses the ordering.
  factory _ParsedVersion.parse(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return _ParsedVersion(const [0, 0, 0, 0, 0]);

    final dash = trimmed.indexOf('-');
    final release = dash == -1 ? trimmed : trimmed.substring(0, dash);
    final suffix = dash == -1 ? '' : trimmed.substring(dash + 1);

    final values = <int>[];

    for (final part in release.split('.')) {
      values.add(int.tryParse(part) ?? 0);
    }

    final suffixParts = suffix.isEmpty ? const <String>[] : suffix.split('.');
    values.add(suffixParts.isNotEmpty ? int.tryParse(suffixParts[0]) ?? 0 : 0);
    values.add(suffixParts.length > 1 ? int.tryParse(suffixParts[1]) ?? 0 : 0);

    while (values.length < fieldCount) {
      values.add(0);
    }

    return _ParsedVersion(values);
  }
}
