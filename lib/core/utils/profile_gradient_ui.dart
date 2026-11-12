import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:novyse/core/services/api/modules/user_module.dart';

/// CSS angle (0° = up, 90° = right, clockwise) → Flutter [LinearGradient].
LinearGradient linearGradientFromProfileGradient(ProfileGradient gradient) {
  var colors = <Color>[
    for (final stop in gradient.stops)
      _colorFromHex(stop.color) ?? Colors.transparent,
  ];
  var stops = <double>[
    for (final stop in gradient.stops) (stop.position / 100).clamp(0.0, 1.0),
  ];
  // LinearGradient needs ≥2 colors; a single stop is a solid fill.
  if (colors.isEmpty) {
    colors = const [Colors.transparent, Colors.transparent];
    stops = const [0.0, 1.0];
  } else if (colors.length == 1) {
    colors = [colors.first, colors.first];
    stops = const [0.0, 1.0];
  }
  final rad = gradient.angle * math.pi / 180;
  final dx = math.sin(rad);
  final dy = -math.cos(rad);
  return LinearGradient(
    colors: colors,
    stops: colors.length == stops.length ? stops : null,
    begin: Alignment(-dx, -dy),
    end: Alignment(dx, dy),
  );
}

ProfileGradient profileGradientFromLinearGradient(
  LinearGradient gradient,
  double angle,
) {
  final stops = gradient.stops;
  final stopsJson = <ProfileGradientStop>[];
  for (var i = 0; i < gradient.colors.length; i++) {
    final position = stops != null && i < stops.length
        ? stops[i] * 100
        : (gradient.colors.length == 1
              ? 0.0
              : i / (gradient.colors.length - 1) * 100);
    final rgb = gradient.colors[i].toARGB32() & 0xFFFFFF;
    stopsJson.add(
      ProfileGradientStop(
        color: '#${rgb.toRadixString(16).padLeft(6, '0').toUpperCase()}',
        position: position,
      ),
    );
  }
  return ProfileGradient(angle: angle % 360, stops: stopsJson);
}

Color? _colorFromHex(String hex) {
  var t = hex.trim();
  if (t.startsWith('#')) t = t.substring(1);
  if (t.length != 6 && t.length != 8) return null;
  if (t.length == 8) t = t.substring(0, 6);
  final v = int.tryParse(t, radix: 16);
  return v == null ? null : Color(0xFF000000 | v);
}
