import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:novyse/core/plugins/bridge/app_sdk_js.dart';
import 'package:novyse/core/plugins/models/frame_origins.dart';
import 'package:novyse/core/plugins/models/plugin_entry.dart';
import 'package:novyse/core/plugins/plugin_build.dart';
import 'package:novyse/core/plugins/plugin_exception.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// The cache of the plugin builds on disk.
///
/// Layout: `plugins/<slug>/<version>/`, with the pinned version directory as
/// the cache key: no HTTP header is ever relied upon. A build is installed by
/// download, digest check, extraction into a staging directory and a rename,
/// so a reader sees either the previous build or the complete new one.
///
/// The budget is global (50 MB): when it is exceeded the least recently used
/// builds are dropped, never the ones a running tile is pinned to.
class PluginCache {
  PluginCache._({Dio? dio}) : _dio = dio ?? Dio();

  /// A cache rooted in `root`, for tests that must not touch the app data.
  @visibleForTesting
  PluginCache.forTesting(this._root, {Dio? dio}) : _dio = dio ?? Dio();

  static final PluginCache instance = PluginCache._();

  /// Total size allowed on disk.
  static const int budgetBytes = 50 * 1024 * 1024;

  /// How long a single filesystem step of an install may take.
  static const Duration installStepTimeout = Duration(seconds: 15);

  /// Marker written on every successful mount, used by the LRU sweep.
  static const String usedMarker = '.used';

  /// Marker of the SDK and CSP digest the cached builds were prepared with.
  static const String sdkMarker = '.sdk';

  final Dio _dio;

  /// One install per build at a time: the second tile awaits the first.
  final Map<String, Future<PluginBuild>> _inflight = {};

  /// Builds pinned by a running activity, never collected.
  final Set<String> _protected = {};

  Directory? _root;

  /// Returns the build, installing it when it is not on disk.
  ///
  /// [onProgress] reports `received` and `total` bytes, `total` is `0` when
  /// the registry does not declare the size.
  Future<PluginBuild> load({
    required String slug,
    required String version,
    required PluginBundle bundle,
    void Function(int received, int total)? onProgress,
  }) {
    final key = '$slug@$version';

    final running = _inflight[key];
    if (running != null) {
      debugPrint('[PluginCache] $key: joining the install in flight');

      return running;
    }

    debugPrint('[PluginCache] $key: load requested');

    final future =
        _load(
          slug: slug,
          version: version,
          bundle: bundle,
          onProgress: onProgress,
        ).whenComplete(() {
          // Block body on purpose: an arrow would return the removed future, and
          // `whenComplete` waits for the future a callback returns. Here that
          // future is the one being completed, so the install would never finish.
          _inflight.remove(key);
        });

    _inflight[key] = future;

    return future;
  }

  /// Marks a build as in use, so the LRU sweep skips it.
  Future<void> protect(String slug, String version) async =>
      _protected.add('$slug@$version');

  /// Releases a build: the sweep may drop it again.
  Future<void> release(String slug, String version) async =>
      _protected.remove('$slug@$version');

  /// Deletes every installed build.
  Future<void> clear() async {
    final root = await _rootDirectory();
    for (final entity in root.listSync()) {
      if (p.basename(entity.path) == sdkMarker) continue;

      try {
        entity.deleteSync(recursive: true);
      } catch (_) {}
    }
  }

  Future<PluginBuild> _load({
    required String slug,
    required String version,
    required PluginBundle bundle,
    void Function(int received, int total)? onProgress,
  }) async {
    final entry = await _entryFile(slug, version);

    if (entry.existsSync() && entry.lengthSync() > 0) {
      _touch(entry.parent);

      return PluginBuild(
        slug: slug,
        version: version,
        filePath: entry.path,
        frameOrigins: _frameOrigins(entry.parent),
      );
    }

    if (bundle.downloadUrl.isEmpty) {
      throw const PluginCacheException(
        'download_failed',
        'The bundle has no download URL',
      );
    }

    final archive = await _download(
      slug: slug,
      version: version,
      bundle: bundle,
      onProgress: onProgress,
    );

    final target = entry.parent;
    final staged = Directory('${target.path}.tmp');

    try {
      if (staged.existsSync()) staged.deleteSync(recursive: true);
      await staged.create(recursive: true);

      final bytes = archive.lengthSync();
      debugPrint('[PluginCache] $slug@$version: $bytes bytes, extracting');

      await _extract(archive, staged);
      final frameOrigins = await _prepare(staged);

      debugPrint('[PluginCache] $slug@$version: extracted and prepared');

      if (target.existsSync()) target.deleteSync(recursive: true);
      await staged.rename(target.path).timeout(installStepTimeout);

      debugPrint('[PluginCache] $slug@$version: moved into ${target.path}');

      await _collectVersions(slug, version).timeout(installStepTimeout);
      await _enforceBudget().timeout(installStepTimeout);

      debugPrint('[PluginCache] $slug@$version: cache ready');

      return PluginBuild(
        slug: slug,
        version: version,
        filePath: entry.path,
        frameOrigins: frameOrigins,
      );
    } on PluginCacheException {
      if (staged.existsSync()) staged.deleteSync(recursive: true);
      rethrow;
    } on TimeoutException {
      if (staged.existsSync()) staged.deleteSync(recursive: true);
      throw const PluginCacheException(
        'cache_unavailable',
        'The build did not reach the cache in time',
      );
    } catch (error) {
      if (staged.existsSync()) staged.deleteSync(recursive: true);
      throw PluginCacheException(
        'corrupt_bundle',
        'The build could not be installed: $error',
      );
    } finally {
      if (archive.existsSync()) archive.deleteSync();
    }
  }

  Future<Directory> _rootDirectory() async {
    final cached = _root;
    if (cached != null) return cached;

    final support = await _supportDirectory();
    final directory = Directory(p.join(support.path, 'plugins'));
    await directory.create(recursive: true);
    _root = directory;

    _invalidateStaleBuilds(directory);

    debugPrint('[PluginCache] cache directory: ${directory.path}');

    return directory;
  }

  /// Drops every installed build when the injected SDK changed.
  ///
  /// The SDK is baked into the document at install time, so a document that
  /// carries another version of it would run the old transport forever: the
  /// digest of the SDK is the cache key of the whole cache.
  void _invalidateStaleBuilds(Directory root) {
    final marker = File(p.join(root.path, sdkMarker));
    // The policy is baked into every document: a change to it must invalidate
    // the builds written with the previous one. Both variants are hashed, so a
    // policy change never leaves a stale document behind, whichever platform
    // wrote the cache.
    final digest = sha256
        .convert(
          utf8.encode(
            '$appSdkSource'
            '${pluginContentSecurityPolicy('')}'
            '${pluginContentSecurityPolicy('', allowEval: true)}',
          ),
        )
        .toString();

    try {
      if (marker.existsSync() && marker.readAsStringSync() == digest) return;
    } catch (_) {}

    for (final entity in root.listSync()) {
      try {
        entity.deleteSync(recursive: true);
      } catch (_) {}
    }

    try {
      marker.writeAsStringSync(digest, flush: false);
    } catch (_) {}
  }

  /// The directory of the data of the application.
  ///
  /// On Linux the platform plugin asks the desktop session for the identifier
  /// of the application, which can block on a session that never answers: the
  /// XDG data directory is the same place and it is read from the environment.
  Future<Directory> _supportDirectory() async {
    if (Platform.isLinux) {
      final dataHome = Platform.environment['XDG_DATA_HOME'];
      final home = Platform.environment['HOME'];

      final base = dataHome != null && dataHome.isNotEmpty
          ? dataHome
          : (home != null && home.isNotEmpty
                ? p.join(home, '.local', 'share')
                : null);

      if (base != null) return Directory(p.join(base, 'novyse'));
    }

    try {
      return await getApplicationSupportDirectory().timeout(
        const Duration(seconds: 10),
      );
    } on TimeoutException {
      throw const PluginCacheException(
        'cache_unavailable',
        'The application directory did not answer',
      );
    } catch (error) {
      throw PluginCacheException(
        'cache_unavailable',
        'The application directory is not available: $error',
      );
    }
  }

  Future<File> _entryFile(String slug, String version) async {
    final root = await _rootDirectory();
    return File(p.join(root.path, slug, version, 'index.html'));
  }

  /// Downloads the archive, verifying the declared size and digest while it
  /// streams to disk: nothing is read twice and nothing is trusted.
  Future<File> _download({
    required String slug,
    required String version,
    required PluginBundle bundle,
    void Function(int received, int total)? onProgress,
  }) async {
    final root = await _rootDirectory();
    final directory = Directory(p.join(root.path, slug));
    await directory.create(recursive: true);

    final part = File(p.join(directory.path, '$version.zip.part'));
    if (part.existsSync()) part.deleteSync();

    final digest = _DigestSink();
    final hasher = sha256.startChunkedConversion(digest);
    var received = 0;

    try {
      debugPrint('[PluginCache] $slug@$version: GET ${bundle.downloadUrl}');

      final response = await _dio.get<ResponseBody>(
        bundle.downloadUrl,
        options: Options(
          responseType: ResponseType.stream,
          followRedirects: true,
          receiveTimeout: const Duration(minutes: 2),
        ),
      );

      debugPrint(
        '[PluginCache] $slug@$version: HTTP ${response.statusCode}, reading',
      );

      final body = response.data;
      if (body == null) {
        throw const PluginCacheException('download_failed', 'Empty response');
      }

      final sink = part.openWrite();
      try {
        await for (final chunk in body.stream) {
          received += chunk.length;

          if (bundle.sizeBytes > 0 && received > bundle.sizeBytes) {
            throw const PluginCacheException(
              'corrupt_bundle',
              'The archive is larger than declared',
            );
          }

          hasher.add(chunk);
          sink.add(chunk);
          onProgress?.call(received, bundle.sizeBytes);
        }

        await sink.flush();
      } finally {
        await sink.close();
      }
    } on DioException catch (error) {
      if (part.existsSync()) part.deleteSync();
      throw PluginCacheException(
        'download_failed',
        error.message ?? 'The archive could not be downloaded',
      );
    } on PluginCacheException {
      if (part.existsSync()) part.deleteSync();
      rethrow;
    } catch (error) {
      if (part.existsSync()) part.deleteSync();
      throw PluginCacheException('download_failed', '$error');
    }

    hasher.close();

    final installed = digest.value?.toString().toLowerCase();
    if (bundle.sha256.isNotEmpty && installed != bundle.sha256) {
      part.deleteSync();
      throw const PluginCacheException(
        'corrupt_bundle',
        'The digest does not match the registry',
      );
    }

    if (bundle.sizeBytes > 0 && received != bundle.sizeBytes) {
      part.deleteSync();
      throw const PluginCacheException(
        'corrupt_bundle',
        'The size does not match the registry',
      );
    }

    final archive = File(p.join(directory.path, '$version.zip'));
    if (archive.existsSync()) archive.deleteSync();
    part.renameSync(archive.path);

    return archive;
  }

  /// Extracts the archive, refusing anything that would escape the staging
  /// directory: entry names are checked before a byte is written.
  Future<void> _extract(File archive, Directory target) async {
    final Archive decoded;

    try {
      decoded = ZipDecoder().decodeBytes(await archive.readAsBytes());
    } catch (error) {
      throw PluginCacheException(
        'corrupt_bundle',
        'The archive is not readable: $error',
      );
    }

    final rootPath = target.absolute.path;

    for (final file in decoded.files) {
      if (!file.isFile) continue;

      final name = file.name.replaceAll(r'\', '/');
      if (name.isEmpty ||
          name.startsWith('/') ||
          name.split('/').contains('..')) {
        throw PluginCacheException(
          'corrupt_bundle',
          'Unsafe archive entry: $name',
        );
      }

      final bytes = file.readBytes();
      if (bytes == null) continue;

      final destination = File(p.join(rootPath, name));
      await destination.parent.create(recursive: true);
      await destination.writeAsBytes(bytes, flush: true);
    }
  }

  /// Validates the layout, rewrites the entry document with the CSP and the SDK
  /// bootstrap, and returns the frame origins of the manifest.
  Future<FrameOrigins> _prepare(Directory staged) async {
    final entry = File(p.join(staged.path, 'index.html'));
    if (!entry.existsSync() || entry.lengthSync() == 0) {
      throw const PluginCacheException(
        'corrupt_bundle',
        'index.html is missing or empty',
      );
    }

    final manifest = File(p.join(staged.path, 'manifest.json'));
    if (!manifest.existsSync()) {
      throw const PluginCacheException(
        'corrupt_bundle',
        'manifest.json is missing',
      );
    }

    final Object? decoded;
    try {
      decoded = jsonDecode(manifest.readAsStringSync());
    } catch (_) {
      throw const PluginCacheException(
        'corrupt_bundle',
        'manifest.json is not valid JSON',
      );
    }

    final frameOrigins = decoded is Map<String, dynamic>
        ? FrameOrigins.fromManifest(decoded)
        : FrameOrigins.none;

    await entry.writeAsString(
      prepareDocument(entry.readAsStringSync(), frameOrigins: frameOrigins),
      flush: true,
    );

    return frameOrigins;
  }

  /// What the manifest of an installed build allows in a frame.
  ///
  /// A build that cannot be read declares nothing: the tile still mounts, with
  /// no frame allowed at all.
  FrameOrigins _frameOrigins(Directory directory) {
    final manifest = File(p.join(directory.path, 'manifest.json'));

    try {
      final decoded = jsonDecode(manifest.readAsStringSync());
      return decoded is Map<String, dynamic>
          ? FrameOrigins.fromManifest(decoded)
          : FrameOrigins.none;
    } catch (_) {
      return FrameOrigins.none;
    }
  }

  /// Deletes the other builds of the same plugin, except the pinned ones.
  Future<void> _collectVersions(String slug, String version) async {
    final root = await _rootDirectory();
    final directory = Directory(p.join(root.path, slug));
    if (!directory.existsSync()) return;

    for (final entity in directory.listSync()) {
      final name = p.basename(entity.path);
      if (name == version || name.startsWith('$version.')) continue;

      final key = '$slug@$name';
      if (_protected.contains(key)) continue;

      try {
        entity.deleteSync(recursive: true);
      } catch (_) {}
    }
  }

  /// Drops the least recently used builds until the budget holds again.
  Future<void> _enforceBudget() async {
    final root = await _rootDirectory();

    final builds =
        <({Directory directory, String key, int size, DateTime used})>[];

    for (final plugin in root.listSync().whereType<Directory>()) {
      for (final version in plugin.listSync().whereType<Directory>()) {
        builds.add((
          directory: version,
          key: '${p.basename(plugin.path)}@${p.basename(version.path)}',
          size: _sizeOf(version),
          used: _usedAt(version),
        ));
      }
    }

    var total = builds.fold<int>(0, (sum, build) => sum + build.size);
    if (total <= budgetBytes) return;

    builds.sort((a, b) => a.used.compareTo(b.used));

    for (final build in builds) {
      if (total <= budgetBytes) break;
      if (_protected.contains(build.key)) continue;

      try {
        build.directory.deleteSync(recursive: true);
        total -= build.size;
      } catch (_) {}
    }
  }

  int _sizeOf(Directory directory) {
    var total = 0;

    try {
      for (final entity in directory.listSync(recursive: true)) {
        if (entity is File) total += entity.lengthSync();
      }
    } catch (_) {}

    return total;
  }

  DateTime _usedAt(Directory directory) {
    final marker = File(p.join(directory.path, usedMarker));

    try {
      if (marker.existsSync()) return marker.lastModifiedSync();
      return directory.statSync().modified;
    } catch (_) {
      return DateTime.fromMillisecondsSinceEpoch(0);
    }
  }

  /// Writes the LRU marker of a build.
  ///
  /// Synchronous on purpose: marking a build as used must never be a future a
  /// tile can wait on, and a marker that cannot be written is not an error.
  void _touch(Directory directory) {
    final marker = File(p.join(directory.path, usedMarker));

    try {
      marker.writeAsStringSync('', flush: false);
    } catch (_) {}
  }
}

/// Collects the SHA-256 of the streamed archive without buffering it.
class _DigestSink implements Sink<Digest> {
  Digest? value;

  @override
  void add(Digest data) {
    value = data;
  }

  @override
  void close() {}
}
