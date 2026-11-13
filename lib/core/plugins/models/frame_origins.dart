import 'package:flutter/foundation.dart';

/// The origins a plugin declared it loads into a frame.
///
/// `manifest.json` is the only source: the sandbox allows no frame at all until
/// the plugin names where it points them, and the same list drives both the
/// policy of the document (`frame-src`) and the navigation delegate, so a
/// declared origin loads inside the sandbox while every other main-frame
/// navigation is blocked: external links are not opened.
///
/// An entry is `https://host`, `https://host:port` or `https://*.host`. A
/// wildcard never covers the apex: `*.example.com` does not allow
/// `https://example.com`.
@immutable
class FrameOrigins {
  const FrameOrigins._(this.values);

  /// Nothing is allowed: the plugin embeds no frame.
  static const FrameOrigins none = FrameOrigins._(<String>[]);

  /// Ceiling of a declaration: past this the plugin is asking for the whole web.
  static const int maxEntries = 8;

  /// Canonical entries, in the order they were declared, without duplicates.
  final List<String> values;

  bool get isEmpty => values.isEmpty;

  /// The `frame-src` source list of the document policy.
  String get csp => values.isEmpty ? "'none'" : values.join(' ');

  /// The origins `manifest.json` declares under `permissions.frame`.
  factory FrameOrigins.fromManifest(Map<String, dynamic> manifest) {
    final permissions = manifest['permissions'];
    if (permissions is! Map) return none;

    return FrameOrigins.from(permissions['frame']);
  }

  /// Parses a declared list, dropping every entry that breaks a rule.
  ///
  /// An invalid entry costs the plugin that entry, never the plugin itself: the
  /// install has already been paid for and the rest of the declaration still
  /// holds.
  factory FrameOrigins.from(Object? raw) {
    if (raw is! List) return none;

    final values = <String>[];
    var rejected = 0;

    for (final entry in raw) {
      final canonical = _canonical(entry);

      if (canonical == null || values.length == maxEntries) {
        rejected++;
        continue;
      }

      if (values.contains(canonical)) continue;

      values.add(canonical);
    }

    if (rejected > 0) {
      debugPrint('[PluginSandbox] $rejected frame origin(s) rejected');
    }

    return values.isEmpty ? none : FrameOrigins._(List.unmodifiable(values));
  }

  /// True when [url] may be loaded inside the sandbox.
  bool allows(String url) {
    if (values.isEmpty) return false;

    final uri = Uri.tryParse(url);
    if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) return false;

    final host = uri.host.toLowerCase();
    final port = uri.hasPort ? uri.port : 443;

    for (final entry in values) {
      final allowed = _split(entry);
      if (allowed == null || allowed.port != port) continue;

      if (allowed.wildcard) {
        if (host.endsWith('.${allowed.host}')) return true;
        continue;
      }

      if (host == allowed.host) return true;
    }

    return false;
  }

  @override
  bool operator ==(Object other) =>
      other is FrameOrigins && listEquals(values, other.values);

  @override
  int get hashCode => Object.hashAll(values);

  @override
  String toString() => values.isEmpty ? 'FrameOrigins.none' : values.join(', ');

  /// `host:label` of a DNS name, without the wildcard prefix.
  static final RegExp _hostPattern = RegExp(
    r'^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$',
  );

  static String? _canonical(Object? raw) {
    if (raw is! String) return null;

    final text = raw.trim().toLowerCase();
    if (!text.startsWith('https://')) return null;

    var rest = text.substring('https://'.length);

    // `https://host/` is how an origin is usually written: the trailing slash
    // carries no information, a path does.
    if (rest.endsWith('/')) rest = rest.substring(0, rest.length - 1);
    if (rest.isEmpty) return null;

    // A path, a query, a fragment or credentials would describe a page, not an
    // origin: the policy works on origins only.
    if (rest.contains('/') ||
        rest.contains('?') ||
        rest.contains('#') ||
        rest.contains('@')) {
      return null;
    }

    var host = rest;
    var port = 443;

    final colon = rest.lastIndexOf(':');
    if (colon >= 0) {
      host = rest.substring(0, colon);
      port = int.tryParse(rest.substring(colon + 1)) ?? -1;
      if (port <= 0 || port > 65535) return null;
    }

    var wildcard = false;
    if (host.startsWith('*.')) {
      wildcard = true;
      host = host.substring(2);
    } else if (host.contains('*')) {
      return null;
    }

    if (!_hostPattern.hasMatch(host)) return null;

    // `*.com` would hand the plugin a whole TLD.
    if (wildcard && !host.contains('.')) return null;

    final name = wildcard ? '*.$host' : host;
    return port == 443 ? 'https://$name' : 'https://$name:$port';
  }

  static ({String host, bool wildcard, int port})? _split(String canonical) {
    final rest = canonical.substring('https://'.length);

    var host = rest;
    var port = 443;

    final colon = rest.lastIndexOf(':');
    if (colon >= 0) {
      host = rest.substring(0, colon);
      port = int.tryParse(rest.substring(colon + 1)) ?? -1;
      if (port <= 0) return null;
    }

    var wildcard = false;
    if (host.startsWith('*.')) {
      wildcard = true;
      host = host.substring(2);
    }

    return (host: host, wildcard: wildcard, port: port);
  }
}
