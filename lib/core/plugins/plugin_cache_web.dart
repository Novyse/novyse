import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:novyse/core/plugins/models/frame_origins.dart';
import 'package:novyse/core/plugins/models/plugin_entry.dart';
import 'package:novyse/core/plugins/plugin_build.dart';
import 'package:novyse/core/plugins/plugin_exception.dart';

/// The cache of the plugin builds on the web.
///
/// A browser cannot read the bundle from disk into a sandboxed iframe, so the
/// "cache" is the HTTP cache of the browser itself: the document is fetched
/// from the self-contained `entryUrl` of the pinned build and handed to the
/// web bridge as a blob. The host never writes plugin files on the web.
class PluginCache {
  PluginCache._({Dio? dio}) : _dio = dio ?? Dio();

  static final PluginCache instance = PluginCache._();

  final Dio _dio;

  /// Fetches the document of a build and prepares it for the sandbox.
  ///
  /// [onProgress] is accepted for interface parity: a single document fetch
  /// has no meaningful granularity, so it is called once at the end.
  Future<PluginBuild> load({
    required String slug,
    required String version,
    required PluginBundle bundle,
    void Function(int received, int total)? onProgress,
  }) async {
    if (bundle.entryUrl.isEmpty) {
      throw const PluginCacheException(
        'download_failed',
        'The bundle has no entry URL',
      );
    }

    final String document;
    try {
      final response = await _dio.get<String>(
        bundle.entryUrl,
        options: Options(
          responseType: ResponseType.plain,
          followRedirects: true,
        ),
      );
      document = response.data ?? '';
    } on DioException catch (error) {
      throw PluginCacheException(
        'download_failed',
        error.message ?? 'The bundle could not be fetched',
      );
    }

    if (document.isEmpty) {
      throw const PluginCacheException(
        'corrupt_bundle',
        'The entry document is empty',
      );
    }

    onProgress?.call(document.length, document.length);

    final frameOrigins = await _frameOriginsOf(bundle.manifestUrl);

    return PluginBuild(
      slug: slug,
      version: version,
      frameOrigins: frameOrigins,
      html: prepareDocument(document, frameOrigins: frameOrigins),
    );
  }

  /// Reads the origins the build declares, from the manifest of the release.
  ///
  /// The registry carries a link, never a copy, so the permissions cannot
  /// drift from the build they belong to. A manifest that cannot be fetched
  /// leaves the sandbox with no frame at all: the plugin still renders, the
  /// player does not, and the card never gains access it did not declare.
  Future<FrameOrigins> _frameOriginsOf(String manifestUrl) async {
    if (manifestUrl.isEmpty) return FrameOrigins.none;

    // Fetched as text: a raw file is served as `text/plain`, so a JSON
    // response type would hand Dio a string it cannot cast, and the failure
    // would leave the sandbox with no frame at all (a player that never
    // loads, without an error the user could see).
    try {
      final response = await _dio.get<String>(
        manifestUrl,
        options: Options(
          responseType: ResponseType.plain,
          followRedirects: true,
        ),
      );

      final raw = response.data;
      if (raw == null || raw.isEmpty) return FrameOrigins.none;

      final manifest = jsonDecode(raw);

      return manifest is Map<String, dynamic>
          ? FrameOrigins.fromManifest(manifest)
          : FrameOrigins.none;
    } on DioException catch (error) {
      debugPrint('[PluginCache] manifest unavailable: ${error.message}');

      return FrameOrigins.none;
    } on FormatException catch (error) {
      debugPrint('[PluginCache] manifest unreadable: ${error.message}');

      return FrameOrigins.none;
    } catch (error) {
      debugPrint('[PluginCache] manifest failed: $error');

      return FrameOrigins.none;
    }
  }

  /// No-op on the web: nothing is written to disk.
  Future<void> protect(String slug, String version) async {}

  /// No-op on the web: nothing is written to disk.
  Future<void> release(String slug, String version) async {}

  /// No-op on the web: the browser owns the document cache.
  Future<void> clear() async {}
}
