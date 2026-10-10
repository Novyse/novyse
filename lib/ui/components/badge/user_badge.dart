import 'dart:convert';

import 'package:flutter/material.dart';

@immutable
class UserBadge {
  const UserBadge({
    required this.id,
    required this.name,
    this.icon,
    required this.color,
  });

  final String id;
  final String name;
  final String? icon;
  final BadgeColor color;

  factory UserBadge.fromMap(Map<String, dynamic> map) {
    final colorRaw = _colorMap(map['color']);
    return UserBadge(
      id: (_firstString(map, const ['badge_id', 'id', 'code', 'slug']) ??
              map.keys.firstOrNull ??
              'badge')
          .toString(),
      name:
          (_firstString(map, const ['name', 'label', 'title']) ??
                  map['badge_id'])
              .toString(),
      icon: _firstString(map, const ['icon', 'iconName'])?.toString(),
      color: colorRaw != null
          ? BadgeColor.fromMap(colorRaw)
          : const BadgeColor(type: BadgeColorType.solid),
    );
  }
}


enum BadgeColorType {
  solid,
  gradientStatic,
  gradientAnimated;

  static BadgeColorType fromString(String? raw) {
    final normalized = (raw ?? '')
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z]'), '');
    if (normalized.contains('animated')) {
      return BadgeColorType.gradientAnimated;
    }
    if (normalized.contains('gradient') || normalized.contains('static')) {
      return BadgeColorType.gradientStatic;
    }
    return BadgeColorType.solid;
  }
}

@immutable
class BadgeColor {
  const BadgeColor({
    this.type = BadgeColorType.solid,
    this.value,
    this.bgColors = const [],
    this.textColor,
    this.borderColor,
  });

  final BadgeColorType type;
  final String? value;
  final List<String> bgColors;
  final String? textColor;
  final String? borderColor;

  factory BadgeColor.fromMap(Map<String, dynamic> map) {
    return BadgeColor(
      type: BadgeColorType.fromString(
        _firstString(map, const ['type', 'colorType', 'kind'])?.toString(),
      ),
      value: _colorString(
        map,
        const ['value', 'color', 'background', 'backgroundColor', 'bg', 'solid'],
      ),
      bgColors: _colorList(
        map,
        const [
          'bgColors',
          'bg_colors',
          'colors',
          'gradient',
          'gradientColors',
          'gradient_colors',
        ],
      ),
      textColor: _colorString(
        map,
        const ['textColor', 'text_color', 'foreground', 'fontColor', 'label'],
      ),
      borderColor: _colorString(
        map,
        const ['borderColor', 'border_color', 'border', 'outline'],
      ),
    );
  }


  List<String> get safeBgColors {
    if (bgColors.isEmpty) return const ['transparent', 'transparent'];
    if (bgColors.length == 1) return [bgColors.first, bgColors.first];
    return bgColors;
  }
}

/// Returns the color map from an object or a JSON string.
Map<String, dynamic>? _colorMap(dynamic raw) {
  if (raw is Map) return Map<String, dynamic>.from(raw);
  if (raw is String && raw.trim().isNotEmpty) {
    try {
      final decoded = jsonDecode(raw.trim());
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
    } catch (_) {
      // Not JSON: no structured color.
    }
  }
  return null;
}

/// First non-empty string among the given keys.
dynamic _firstString(Map<String, dynamic> map, List<String> keys) {
  for (final key in keys) {
    final value = map[key];
    if (value is String && value.isNotEmpty) return value;
    if (value is num) return value;
  }
  return null;
}

/// Normalizes a color (hex string with/without `#`, `hsl()`/`hsla()`
/// string, ARGB int) into a [parseBadgeHex]-compatible form.
String? _normalizeColor(dynamic raw) {
  if (raw == null) return null;
  if (raw is num) {
    final value = raw.toInt();
    return '#${value.toRadixString(16).padLeft(8, '0').toUpperCase()}';
  }
  if (raw is String) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    if (trimmed == 'transparent') return trimmed;
    final lower = trimmed.toLowerCase();
    if (lower.startsWith('hsl(') || lower.startsWith('hsla(')) {
      return trimmed;
    }
    final hex = trimmed.replaceFirst('#', '');
    if (!RegExp(r'^[0-9a-fA-F]+$').hasMatch(hex)) return null;
    if (hex.length == 3 || hex.length == 6 || hex.length == 8) {
      return '#$hex';
    }
  }
  return null;
}

/// Single color from the first available key.
String? _colorString(Map<String, dynamic> map, List<String> keys) {
  for (final key in keys) {
    final normalized = _normalizeColor(map[key]);
    if (normalized != null) return normalized;
  }
  return null;
}

/// Color list: accepts a list, a single string, a nested JSON string,
/// or a single int.
List<String> _colorList(Map<String, dynamic> map, List<String> keys) {
  for (final key in keys) {
    final value = map[key];
    if (value == null) continue;
    final candidates = value is List ? value : [value];
    final colors = <String>[];
    for (final candidate in candidates) {
      if (candidate is String) {
        final trimmed = candidate.trim();
        // Try decoding a nested JSON string.
        if (trimmed.startsWith('[')) {
          try {
            final decoded = jsonDecode(trimmed);
            if (decoded is List) {
              for (final nested in decoded) {
                final normalized = _normalizeColor(nested);
                if (normalized != null) colors.add(normalized);
              }
              continue;
            }
          } catch (_) {
            // Not valid JSON, fall through.
          }
        }
      }
      final normalized = _normalizeColor(candidate);
      if (normalized != null) colors.add(normalized);
    }
    if (colors.isNotEmpty) return colors;
  }
  return const [];
}

/// Parses a hex color (`#RGB`, `#RRGGBB`, `#AARRGGBB`, with or without `#`)
/// or `hsl(H, S%, L%)` / `hsla(H, S%, L%, A)` as sent by the backend.
///
/// Returns `fallback` when the string is invalid.
Color parseBadgeHex(String? raw, {Color fallback = Colors.transparent}) {
  if (raw == null) return fallback;
  final trimmed = raw.trim();
  if (trimmed == 'transparent') return Colors.transparent;

  final hslMatch = RegExp(
    r'^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$',
    caseSensitive: false,
  ).firstMatch(trimmed);
  if (hslMatch != null) {
    final hue = double.tryParse(hslMatch.group(1) ?? '') ?? 0;
    final saturation =
        ((double.tryParse(hslMatch.group(2) ?? '') ?? 0).clamp(0, 100) / 100)
            .toDouble();
    final lightness =
        ((double.tryParse(hslMatch.group(3) ?? '') ?? 0).clamp(0, 100) / 100)
            .toDouble();
    final alpha = hslMatch.group(4) != null
        ? (double.tryParse(hslMatch.group(4)!) ?? 1).clamp(0, 1).toDouble()
        : 1.0;
    return HSLColor.fromAHSL(alpha, hue % 360, saturation, lightness).toColor();
  }

  var hex = trimmed.replaceFirst('#', '');
  if (hex.length == 3) {
    hex = hex.split('').map((c) => '$c$c').join();
  }
  if (hex.length == 6) hex = 'FF$hex';
  if (hex.length != 8) return fallback;
  final value = int.tryParse(hex, radix: 16);
  if (value == null) return fallback;
  return Color(value);
}
