import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:novyse/core/config/global.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A legal document shown by the application.
///
/// Every document is bundled as an asset, so the first paint is instant and
/// works offline. The runtime copy cached by [LegalService] wins over the
/// asset when it exists: the user reads the latest published version without
/// waiting for an application update.
enum LegalDocument {
  privacy('legal/privacy-policy.md', 'privacy'),
  terms('legal/terms-of-service.md', 'tos'),
  license('LICENSE', 'license');

  const LegalDocument(this.asset, this.endpointPath);

  /// Path of the document compiled in the application bundle.
  final String asset;

  /// Last segment of the API endpoint that publishes the document.
  final String endpointPath;

  /// Loads the best available copy: cache, network refresh in background, or
  /// the bundled asset as the immediate fallback.
  Future<String> load() => LegalService.instance.load(this);
}

/// Offline-first reader of the legal documents.
///
/// The reads never await the network on the path that paints the screen: the
/// cached copy (or the bundled asset) is returned immediately, while a
/// background refresh with a short timeout updates the cache. A failure, a
/// timeout or a missing network is silent: the user keeps reading the copy
/// they already have.
class LegalService {
  LegalService({Dio? client}) : _client = client ?? Dio();

  static final LegalService instance = LegalService();

  final Dio _client;

  static const String _contentPrefix = 'legal_content_';
  static const String _hashPrefix = 'legal_hash_';
  static const Duration _timeout = Duration(milliseconds: 1800);

  /// Loads [document] from the local cache, falling back to the bundled asset.
  Future<String> load(LegalDocument document) async {
    unawaited(_refresh(document));

    try {
      final preferences = await SharedPreferences.getInstance();
      final cached = preferences.getString('$_contentPrefix${document.name}');

      if (cached != null && cached.isNotEmpty) return cached;
    } catch (_) {
      // A storage failure must not hide the document: use the asset.
    }

    return rootBundle.loadString(document.asset);
  }

  /// Refreshes every document in the background. Called when the signup
  /// screen opens and when the legal section of the settings opens.
  Future<void> prefetch() async {
    await Future.wait(LegalDocument.values.map(_refresh));
  }

  /// Fetches the current version of [document], using the cached hash as an
  /// ETag. Every failure is ignored.
  Future<void> _refresh(LegalDocument document) async {
    try {
      final preferences = await SharedPreferences.getInstance();
      final hash = preferences.getString('$_hashPrefix${document.name}');

      final response = await _client.get<dynamic>(
        '$authBaseUrl/legal/${document.endpointPath}',
        options: Options(
          responseType: ResponseType.json,
          sendTimeout: _timeout,
          receiveTimeout: _timeout,
          headers: {
            'Accept': 'application/json',
            if (hash != null && hash.isNotEmpty) 'If-None-Match': '"$hash"',
          },
          validateStatus: (status) => status != null && status < 500,
        ),
      );

      if (response.statusCode != 200) return;

      final payload = response.data;
      if (payload is! Map) return;

      final content = payload['content'];
      if (content is! String || content.isEmpty) return;

      await preferences.setString('$_contentPrefix${document.name}', content);

      final nextHash = payload['hash'];
      if (nextHash is String && nextHash.isNotEmpty) {
        await preferences.setString('$_hashPrefix${document.name}', nextHash);
      }
    } catch (_) {
      // Offline, timeout or a temporary outage: keep the cached copy.
    }
  }
}
