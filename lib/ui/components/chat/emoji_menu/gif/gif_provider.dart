import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';

/// Result of a GIF fetch: items plus the provider ids advertised by the backend.
typedef GifFetchResult = ({List<GifItem> items, List<String> providers});

/// Abstraction over GIF sources.
///
/// Today there is a single [BackendGifProvider] that talks to
/// `GET /search/gif` (Klipy behind the gateway). Adding Giphy/Tenor/direct
/// Klipy later means adding a new implementation and registering it in
/// [gifProviderRegistryProvider] — the picker UI stays untouched.
abstract class GifProvider {
  /// Stable id, e.g. 'klipy'. Matches the `provider` field of [GifItem]
  /// and the `provider` query param accepted by the gateway.
  String get id;

  Future<GifFetchResult> trending({int limit = 24, int page = 1});

  Future<GifFetchResult> search(
    String query, {
    int limit = 24,
    int page = 1,
    String providerId = 'all',
  });
}

/// Gateway-backed implementation (Klipy today, multi-provider via `provider`).
class BackendGifProvider implements GifProvider {
  BackendGifProvider(this._gateway);

  final Gateway _gateway;

  @override
  String get id => 'backend';

  @override
  Future<GifFetchResult> trending({int limit = 24, int page = 1}) =>
      search('', limit: limit, page: page);

  @override
  Future<GifFetchResult> search(
    String query, {
    int limit = 24,
    int page = 1,
    String providerId = 'all',
  }) async {
    final res = await _gateway.search.gif(
      query: query,
      limit: limit,
      page: page,
      provider: providerId,
    );
    if (!res.success || res.data == null) {
      throw StateError(res.error ?? 'GIF search failed');
    }
    final rawItems = res.data!['items'];
    final rawProviders = res.data!['providers'];
    final items = <GifItem>[];
    if (rawItems is List) {
      for (final e in rawItems) {
        if (e is Map) {
          final item = GifItem.fromJson(Map<String, dynamic>.from(e));
          if (item.url.isNotEmpty) items.add(item);
        }
      }
    }
    final providers = <String>[];
    if (rawProviders is List) {
      for (final e in rawProviders) {
        final s = e?.toString() ?? '';
        if (s.isNotEmpty && !providers.contains(s)) providers.add(s);
      }
    }
    return (items: items, providers: providers);
  }
}

/// Active GIF provider. Swap/override in tests or when adding new sources.
final gifProviderProvider = Provider<GifProvider>((ref) {
  final gateway = ref.watch(apiGatewayProvider);
  return BackendGifProvider(gateway);
});
