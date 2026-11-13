import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/plugins/models/plugin_entry.dart';
import 'package:novyse/core/services/api_gateway.dart';

/// The registry entry of a plugin, `null` when it cannot be read.
///
/// The tile needs the name and the icon of the plugin it is running, and the
/// activity itself only carries the slug and the pinned version. A failure is
/// not an error here: the tile falls back to the slug.
final pluginEntryProvider = FutureProvider.family<PluginEntry?, String>((
  ref,
  slug,
) async {
  try {
    return await apiGateway.plugins.registry.get(slug);
  } catch (_) {
    return null;
  }
});
