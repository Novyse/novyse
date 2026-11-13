import 'dart:io';

import 'package:novyse/core/plugins/bridge/document_server.dart';
import 'package:novyse/core/plugins/plugin_build.dart';

/// Hands the sandbox its document on a native platform.
///
/// The build is on disk, so it is served over loopback: a `file://` page has a
/// null origin and the player a plugin embeds refuses to run without one.
class PluginDocumentHost {
  PluginDocumentHost({required this.instanceId});

  /// Name used in the logs, so a served request can be traced to its tile.
  final String instanceId;

  late final PluginDocumentServer _server = PluginDocumentServer(
    instanceId: instanceId,
  );

  /// The origin of the served document, `null` before [open].
  String? get origin => _server.origin;

  /// Serves [build] and returns the URL of its document; `null` when the build
  /// is not on disk.
  Future<Uri?> open(PluginBuild build) async {
    if (!build.isFile) return null;

    return Uri.parse(await _server.start(File(build.filePath!)));
  }

  Future<void> close() => _server.stop();
}
