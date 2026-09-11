import 'package:flutter/foundation.dart';

/// Single GIF result, normalized by the API gateway.
///
/// The gateway already abstracts the upstream provider (Klipy today,
/// Giphy/Tenor/others tomorrow): the UI only consumes [url]/[previewUrl]
/// and filters by [provider] id.
@immutable
class GifItem {
  const GifItem({
    required this.id,
    this.provider,
    this.title = '',
    required this.url,
    required this.previewUrl,
    this.width = 0,
    this.height = 0,
  });

  final String id;
  final String? provider;
  final String title;
  final String url;
  final String previewUrl;
  final double width;
  final double height;

  double get aspectRatio {
    if (width > 0 && height > 0) return width / height;
    return 1.0;
  }

  factory GifItem.fromJson(Map<String, dynamic> json) {
    double parseDim(dynamic v) {
      if (v is num) return v.toDouble();
      if (v is String) return double.tryParse(v) ?? 0;
      return 0;
    }

    final rawUrl = (json['url'] ?? '').toString();
    final rawPreview = (json['previewUrl'] ?? json['preview_url'] ?? rawUrl)
        .toString();
    return GifItem(
      id: (json['id'] ?? rawUrl).toString(),
      provider: json['provider']?.toString(),
      title: (json['title'] ?? '').toString(),
      url: rawUrl,
      previewUrl: rawPreview.isEmpty ? rawUrl : rawPreview,
      width: parseDim(json['width']),
      height: parseDim(json['height']),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'provider': provider,
    'title': title,
    'url': url,
    'previewUrl': previewUrl,
    'width': width,
    'height': height,
  };

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is GifItem &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          url == other.url;

  @override
  int get hashCode => Object.hash(id, url);
}
