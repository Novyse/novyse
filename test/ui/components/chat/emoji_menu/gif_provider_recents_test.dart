import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_provider.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_recents_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeGifProvider implements GifProvider {
  FakeGifProvider({this.items = const [], this.providers = const []});

  final List<GifItem> items;
  final List<String> providers;
  String? lastQuery;
  String? lastProviderId;
  int? lastPage;

  @override
  String get id => 'fake';

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
    lastQuery = query;
    lastProviderId = providerId;
    lastPage = page;
    return (items: items, providers: providers);
  }
}

const _g1 = GifItem(
  id: 'g1',
  provider: 'klipy',
  url: 'https://cdn.example/g1.gif',
  previewUrl: 'https://cdn.example/g1_preview.gif',
);
const _g2 = GifItem(
  id: 'g2',
  provider: 'giphy',
  url: 'https://cdn.example/g2.gif',
  previewUrl: 'https://cdn.example/g2_preview.gif',
);

void main() {
  group('GifProvider contract (fake backend)', () {
    test('search forwards query/provider/page', () async {
      final fake = FakeGifProvider(
        items: [_g1, _g2],
        providers: const ['klipy', 'giphy'],
      );
      final res = await fake.search('cat', providerId: 'all', page: 2);

      expect(res.items, hasLength(2));
      expect(res.providers, ['klipy', 'giphy']);
      expect(fake.lastQuery, 'cat');
      expect(fake.lastProviderId, 'all');
      expect(fake.lastPage, 2);
    });

    test('provider registry can be overridden per-test', () async {
      final container = ProviderContainer(
        overrides: [
          gifProviderProvider.overrideWithValue(
            FakeGifProvider(items: [_g1], providers: const ['klipy']),
          ),
        ],
      );
      addTearDown(container.dispose);

      final provider = container.read(gifProviderProvider);
      final res = await provider.search('');
      expect(res.items, [_g1]);
      expect(res.providers, ['klipy']);
    });
  });

  group('GifRecentsStore', () {
    test('push dedupes, caps at 24 and persists across restarts', () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final container = ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
      addTearDown(container.dispose);

      final notifier = container.read(gifRecentsProvider.notifier);
      await notifier.push(_g1);
      await notifier.push(_g2);
      await notifier.push(_g1); // re-select moves to front, no duplicate

      expect(
        container.read(gifRecentsProvider).map((g) => g.id),
        ['g1', 'g2'],
      );

      // Simulate restart: new store reads the same prefs.
      final container2 = ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
      addTearDown(container2.dispose);
      expect(
        container2.read(gifRecentsProvider).map((g) => g.id),
        ['g1', 'g2'],
      );
    });

    test('corrupt storage yields empty recents instead of throwing', () async {
      SharedPreferences.setMockInitialValues({
        GifRecentsStore.storageKey: 'not-json{{{',
      });
      final prefs = await SharedPreferences.getInstance();
      final container = ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
      addTearDown(container.dispose);

      expect(container.read(gifRecentsProvider), isEmpty);
    });
  });
}
