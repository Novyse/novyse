import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;

/// Serves one installed build over loopback, so the sandbox document has a real
/// `http://127.0.0.1:PORT` origin instead of `file://`.
class PluginDocumentServer {
  PluginDocumentServer({required this.instanceId});

  /// Name used in the logs, so a served request can be traced to its tile.
  final String instanceId;

  HttpServer? _server;
  Directory? _root;

  /// The origin the served document lives on, `null` before [start].
  String? get origin {
    final server = _server;
    return server == null ? null : 'http://127.0.0.1:${server.port}/';
  }

  /// Starts the server on [entry]'s directory and returns the URL of [entry].
  Future<String> start(File entry) async {
    final root = entry.parent;
    final running = _server;

    if (running != null && _root?.path == root.path) {
      return _url(running.port, entry.path);
    }

    await stop();

    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    _server = server;
    _root = root;

    server.listen((request) {
      unawaited(_serve(request, root));
    });

    final url = _url(server.port, entry.path);

    debugPrint('[PluginBridge] $instanceId: serving ${root.path} at $url');

    return url;
  }

  /// Stops the server, dropping the requests still in flight.
  Future<void> stop() async {
    final server = _server;
    _server = null;
    _root = null;

    if (server == null) return;

    try {
      await server.close(force: true);
    } catch (error) {
      debugPrint('[PluginBridge] $instanceId: server close failed: $error');
    }
  }

  String _url(int port, String path) =>
      'http://127.0.0.1:$port/${p.basename(path)}';

  /// Serves one file of the build, and nothing outside of it.
  Future<void> _serve(HttpRequest request, Directory root) async {
    try {
      final relative = request.uri.pathSegments.join('/');
      final file = File(p.join(root.path, relative));

      if (relative.isEmpty ||
          !p.isWithin(root.absolute.path, file.absolute.path) ||
          !file.existsSync()) {
        request.response.statusCode = HttpStatus.notFound;
        await request.response.close();
        return;
      }

      request.response.headers.contentType = _contentType(file.path);
      request.response.add(await file.readAsBytes());
      await request.response.close();

      debugPrint('[PluginBridge] $instanceId: served /$relative');
    } catch (error) {
      debugPrint('[PluginBridge] $instanceId: serve failed: $error');

      try {
        request.response.statusCode = HttpStatus.internalServerError;
        await request.response.close();
      } catch (_) {}
    }
  }

  ContentType _contentType(String path) {
    switch (p.extension(path)) {
      case '.html':
        return ContentType.html;
      case '.js':
        return ContentType('text', 'javascript', charset: 'utf-8');
      case '.css':
        return ContentType('text', 'css', charset: 'utf-8');
      case '.json':
        return ContentType.json;
      case '.svg':
        return ContentType('image', 'svg+xml');
      case '.png':
        return ContentType('image', 'png');
      case '.jpg':
      case '.jpeg':
        return ContentType('image', 'jpeg');
      case '.webp':
        return ContentType('image', 'webp');
      case '.gif':
        return ContentType('image', 'gif');
      case '.mp3':
        return ContentType('audio', 'mpeg');
      case '.ogg':
        return ContentType('audio', 'ogg');
      case '.wav':
        return ContentType('audio', 'wav');
      case '.woff2':
        return ContentType('font', 'woff2');
      default:
        return ContentType.binary;
    }
  }
}
