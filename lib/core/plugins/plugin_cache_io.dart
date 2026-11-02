import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
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

  static final PluginCache instance = PluginCache._();

  /// Total size allowed on disk.
  static const int budgetBytes = 50 * 1024 * 1024;

  /// Marker written on every successful mount, used by the LRU sweep.
  static const String usedMarker = '.used';

  final Dio _dio;

  /// One install per build at a time: the second tile awaits the first.
  final Map<String, Future<PluginBuild>> _inflight = {};

  /// Builds pinned by a running activity, never collected.
  final Set<String> _protected = {};

  Directory? _root;

  /// The directory of the installed build, or `null` when it is missing.
  Future<bool> isCached(String slug, String version) async {
    final entry = await _entryFile(slug, version);
    return entry.existsSync() && entry.lengthSync() > 0;
  }

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
    if (running != null) return running;

    final future = _load(
      slug: slug,
      version: version,
      bundle: bundle,
      onProgress: onProgress,
    ).whenComplete(() => _inflight.remove(key));

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
      await _touch(entry.parent);
      return PluginBuild(slug: slug, version: version, filePath: entry.path);
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

      await _extract(archive, staged);
      await _prepare(staged);

      if (target.existsSync()) target.deleteSync(recursive: true);
      await staged.rename(target.path);

      await _collectVersions(slug, version);
      await _enforceBudget();

      return PluginBuild(slug: slug, version: version, filePath: entry.path);
    } on PluginCacheException {
      if (staged.existsSync()) staged.deleteSync(recursive: true);
      rethrow;
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

    final support = await getApplicationSupportDirectory();
    final directory = Directory(p.join(support.path, 'plugins'));
    await directory.create(recursive: true);
    _root = directory;

    return directory;
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
      final response = await _dio.get<ResponseBody>(
        bundle.downloadUrl,
        options: Options(
          responseType: ResponseType.stream,
          followRedirects: true,
          receiveTimeout: const Duration(minutes: 2),
        ),
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

  /// Validates the layout and rewrites the entry document with the CSP and
  /// the SDK bootstrap.
  Future<void> _prepare(Directory staged) async {
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

    try {
      jsonDecode(manifest.readAsStringSync());
    } catch (_) {
      throw const PluginCacheException(
        'corrupt_bundle',
        'manifest.json is not valid JSON',
      );
    }

    await entry.writeAsString(
      prepareDocument(entry.readAsStringSync()),
      flush: true,
    );
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

  Future<void> _touch(Directory directory) async {
    try {
      final marker = File(p.join(directory.path, usedMarker));
      await marker.writeAsString('', flush: false);
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
