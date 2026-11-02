import 'package:dio/dio.dart';
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

    return PluginBuild(
      slug: slug,
      version: version,
      html: prepareDocument(document),
    );
  }

  /// No-op on the web: nothing is written to disk.
  Future<void> protect(String slug, String version) async {}

  /// No-op on the web: nothing is written to disk.
  Future<void> release(String slug, String version) async {}

  /// No-op on the web: the browser owns the document cache.
  Future<void> clear() async {}
}
