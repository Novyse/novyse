import 'package:novyse/core/plugins/plugin_build.dart';
import 'package:web/web.dart' as web;

/// Hands the sandbox its document in a browser.
///
class PluginDocumentHost {
  PluginDocumentHost({required this.instanceId});

  /// Name used in the logs, so a document can be traced to its tile.
  final String instanceId;

  /// The origin of the app: what the document and its embeds inherit.
  String? get origin => web.window.location.origin;

  /// Loads nothing here: with no url the bridge mounts [build] with `srcdoc`.
  Future<Uri?> open(PluginBuild build) async => null;

  Future<void> close() async {}
}
