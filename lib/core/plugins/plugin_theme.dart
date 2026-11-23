import 'package:material_ui/material_ui.dart';

import 'package:novyse/core/themes/themes.dart';

/// The palette of the host, as a plugin receives it in `init()`.
///
/// `themeColors` is the standard way to color a plugin: the array is computed
/// from the same [AppTheme] the app draws with, so the tile follows the theme
/// mode, the selected palette and the surface treatment (AMOLED included).
///
/// `themeRadii` carries the corner radii of [AppRadius] in CSS pixels, so a
/// plugin can round its controls like the app instead of hardcoding them.
Map<String, Object?> pluginThemePayload(
  Map<String, Object?> settings,
  Brightness platformBrightness,
) {
  final mode = themeModeFromSetting(settings['appearance.themeMode']);
  final brightness = switch (mode) {
    ThemeMode.dark => Brightness.dark,
    ThemeMode.light => Brightness.light,
    ThemeMode.system => platformBrightness,
  };

  final theme = AppTheme.build(
    brightness: brightness,
    palette: paletteFromSettings(settings),
    surface: surfaceFromSetting(settings['appearance.surfaceMode']),
  );
  final scheme = theme.colorScheme;
  final status = theme.extension<AppStatusColors>() ?? AppStatusColors.fallback;

  final field = brightness == Brightness.dark
      ? scheme.surfaceContainerHighest
      : scheme.surfaceContainerLowest;

  return {
    'theme': brightness == Brightness.dark ? 'dark' : 'light',
    'themeColors': [
      _hex(scheme.surface),
      _hex(scheme.surfaceContainerLow),
      _hex(scheme.surfaceContainerHigh),
      _hex(field),
      _hex(scheme.outlineVariant),
      _hex(scheme.outline),
      _hex(scheme.onSurface),
      _hex(scheme.onSurfaceVariant),
      _hex(scheme.primary),
      _hex(scheme.onPrimary),
      _rgba(scheme.primary, 0.16),
      _hex(status.danger),
      _hex(status.success),
      _hex(status.warning),
      _hex(status.info),
    ],
    'themeRadii': {
      'sm': AppRadius.sm.round(),
      'md': AppRadius.md.round(),
      'lg': AppRadius.lg.round(),
    },
  };
}

/// A stable key of a payload, to push a theme only when it really changed.
String pluginThemeSignature(Map<String, Object?> payload) {
  final colors = payload['themeColors'];
  final radii = payload['themeRadii'];

  return '${payload['theme']}'
      '|${colors is List ? colors.join(',') : ''}'
      '|${radii is Map ? '${radii['sm']},${radii['md']},${radii['lg']}' : ''}';
}

/// The stock light palette, used when the settings scope is not available
const List<String> fallbackPluginThemeColors = [
  '#F5F9FF',
  '#F1F6FF',
  '#ECF3FF',
  '#FCFDFF',
  '#E5EEFA',
  '#D9E7FB',
  '#0E1826',
  '#53637B',
  '#0F6FFF',
  '#FFFFFF',
  'rgba(15, 111, 255, 0.10)',
  '#E45757',
  '#1DBF73',
  '#FFC857',
  '#2D9CDB',
];

String _hex(Color color) {
  final rgb = color.toARGB32() & 0xFFFFFF;

  return '#${rgb.toRadixString(16).padLeft(6, '0').toUpperCase()}';
}

String _rgba(Color color, double alpha) {
  final argb = color.toARGB32();
  final red = (argb >> 16) & 0xFF;
  final green = (argb >> 8) & 0xFF;
  final blue = argb & 0xFF;

  return 'rgba($red, $green, $blue, ${alpha.toStringAsFixed(2)})';
}
