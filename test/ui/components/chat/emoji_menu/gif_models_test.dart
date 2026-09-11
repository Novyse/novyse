import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';

void main() {
  group('GifItem', () {
    test('fromJson parses gateway payload', () {
      final item = GifItem.fromJson({
        'id': 'abc',
        'provider': 'klipy',
        'title': 'Funny cat',
        'url': 'https://cdn.example/cat.gif',
        'previewUrl': 'https://cdn.example/cat_preview.gif',
        'width': 200,
        'height': 100,
      });

      expect(item.id, 'abc');
      expect(item.provider, 'klipy');
      expect(item.url, 'https://cdn.example/cat.gif');
      expect(item.previewUrl, 'https://cdn.example/cat_preview.gif');
      expect(item.aspectRatio, 2.0);
    });

    test('fromJson falls back to url when preview missing', () {
      final item = GifItem.fromJson({
        'id': 'x',
        'url': 'https://cdn.example/x.gif',
      });

      expect(item.previewUrl, 'https://cdn.example/x.gif');
      expect(item.aspectRatio, 1.0);
    });

    test('toJson round-trips through recents storage', () {
      const item = GifItem(
        id: 'k1',
        provider: 'klipy',
        title: 't',
        url: 'https://cdn.example/k1.gif',
        previewUrl: 'https://cdn.example/k1_preview.gif',
        width: 120,
        height: 60,
      );
      final restored = GifItem.fromJson(item.toJson());
      expect(restored, item);
    });

    test('equality is id + url based', () {
      const a = GifItem(id: '1', url: 'https://a.gif', previewUrl: 'https://a.gif');
      const b = GifItem(id: '1', url: 'https://a.gif', previewUrl: 'https://other.gif');
      const c = GifItem(id: '2', url: 'https://a.gif', previewUrl: 'https://a.gif');
      expect(a, b);
      expect(a == c, isFalse);
    });
  });
}
