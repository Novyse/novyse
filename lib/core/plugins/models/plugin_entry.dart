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
    required this.iconUrl,
    required this.downloadUrl,
    required this.author,
    required this.entryUrl,
    required this.sha256,
    required this.sizeBytes,
    required this.minAppVersion,
    required this.capabilities,
    required this.manifestUrl,
    required this.bannerUrl,
    required this.readmeUrl,
    required this.locales,
    required this.channels,
    required this.frameOrigins,
  });

  /// Identifier of the plugin, `[a-z0-9-]`, at most 64 chars.
  final String slug;

  /// Display name shown in the store and on the tile.
  final String name;

  /// Author declared by the manifest.
  final PluginAuthor author;

  /// Short description shown in the store.
  final String description;

  /// Published version, the semver of the release.
  final String version;

  /// Absolute URL of the icon, empty when the plugin has none.
  final String iconUrl;

  /// Absolute URL of the store banner, empty when the plugin has none.
  final String bannerUrl;

  /// Absolute URL of the README at the tag of the release, empty when unknown.
  final String readmeUrl;

  /// Languages the UI of the plugin is translated into.
  final List<String> locales;

  /// Communication channels the plugin declares.
  final List<String> channels;

  /// Origins the plugin loads into a frame.
  final List<String> frameOrigins;

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

  /// Absolute URL of the manifest of this build, at the tag of the release.
  ///
  /// The registry carries a link, never a copy: whoever needs the permissions
  /// fetches the manifest from the repository, so what it reads cannot drift
  /// from the build it belongs to. On native the same file is already inside
  /// the bundle, and the cache reads it from there.
  final String manifestUrl;

  factory PluginEntry.fromJson(Map<String, dynamic> json) {
    final capabilities = json['capabilities'];
    final locales = json['locales'];
    final permissions = json['permissions'];
    final channels = permissions is Map ? permissions['channels'] : null;
    final frame = permissions is Map ? permissions['frame'] : null;

    return PluginEntry(
      slug: json['slug']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      author: PluginAuthor.fromJson(json['author']),
      description: json['description']?.toString() ?? '',
      version: json['version']?.toString() ?? '',
      iconUrl: json['iconUrl']?.toString() ?? '',
      downloadUrl: json['downloadUrl']?.toString() ?? '',
      entryUrl: json['entryUrl']?.toString() ?? '',
      sha256: json['sha256']?.toString().toLowerCase() ?? '',
      sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
      minAppVersion: json['minAppVersion']?.toString() ?? '',
      capabilities: capabilities is List
          ? capabilities.map((entry) => entry.toString()).toList()
          : const [],
      manifestUrl: json['manifestUrl']?.toString() ?? '',
      bannerUrl: json['bannerUrl']?.toString() ?? '',
      readmeUrl: json['readmeUrl']?.toString() ?? '',
      locales: locales is List
          ? locales.map((entry) => entry.toString()).toList()
          : const [],
      channels: channels is List
          ? channels.map((entry) => entry.toString()).toList()
          : const [],
      frameOrigins: frame is List
          ? frame.map((entry) => entry.toString()).toList()
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
    manifestUrl: manifestUrl,
    channels: channels,
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

/// Who published a plugin: the display name and, when declared, the page of the
/// author.
///
/// The URL is optional: the store makes the name clickable only when the
/// registry declared one. A plain string is still accepted as the bare name, so
/// an older registry keeps working.
@immutable
class PluginAuthor {
  const PluginAuthor({required this.name, this.url = ''});

  /// Display name of the author, `Novyse` for the official library.
  final String name;

  /// Page of the author, empty when unknown.
  final String url;

  /// True when there is no name to show.
  bool get isEmpty => name.isEmpty;

  factory PluginAuthor.fromJson(Object? json) {
    if (json is Map) {
      return PluginAuthor(
        name: json['name']?.toString() ?? '',
        url: json['url']?.toString() ?? '',
      );
    }

    return PluginAuthor(name: json?.toString() ?? '');
  }
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
    required this.manifestUrl,
    required this.channels,
  });

  final String downloadUrl;
  final String entryUrl;
  final String sha256;
  final int sizeBytes;
  final List<String> capabilities;

  /// Communication channels the manifest declares.
  final List<String> channels;

  /// Absolute URL of the manifest of this build, empty when unknown.
  final String manifestUrl;

  factory PluginBundle.fromJson(Map<String, dynamic> json) {
    final capabilities = json['capabilities'];
    final channels = json['channels'];

    return PluginBundle(
      downloadUrl: json['downloadUrl']?.toString() ?? '',
      entryUrl: json['entryUrl']?.toString() ?? '',
      sha256: json['sha256']?.toString().toLowerCase() ?? '',
      sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
      capabilities: capabilities is List
          ? capabilities.map((entry) => entry.toString()).toList()
          : const [],
      manifestUrl: json['manifestUrl']?.toString() ?? '',
      channels: channels is List
          ? channels.map((entry) => entry.toString()).toList()
          : const [],
    );
  }

  /// True when the plugin declares [capability].
  bool allows(String capability) => capabilities.contains(capability);

  /// True when the plugin may write on [channel].
  bool allowsChannel(String channel) => channels.contains(channel);
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
