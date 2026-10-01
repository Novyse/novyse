import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:novyse/ui/components/app_scrollbar.dart';

/// Fixed status colors. They stay recognizable across palettes and travel
/// with the theme via [AppStatusColors].
class AppColors {
  static const Color success = Color(0xFF1DBF73);
  static const Color warning = Color(0xFFFFC857);
  static const Color danger = Color(0xFFE45757);
  static const Color info = Color(0xFF2D9CDB);
}

/// A named seed. Presets are hardcoded; [AppPalette.custom] is the hook for
/// a future user-authored theme (same builder, seed chosen at runtime).
class AppPalette {
  static const customId = 'custom';

  final String id;
  final Color seed;

  const AppPalette({required this.id, required this.seed});

  static const novyse = AppPalette(id: 'novyse', seed: Color(0xFF0F6FFF));
  static const forest = AppPalette(id: 'forest', seed: Color(0xFF1B8A4A));
  static const sunset = AppPalette(id: 'sunset', seed: Color(0xFFE36A2E));
  static const iris = AppPalette(id: 'iris', seed: Color(0xFF6D4AFF));

  static const presets = [novyse, forest, sunset, iris];

  factory AppPalette.custom(Color seed) =>
      AppPalette(id: customId, seed: seed);

  static AppPalette byId(String? id) {
    for (final palette in presets) {
      if (palette.id == id) return palette;
    }
    return novyse;
  }
}

enum SurfaceTreatment { standard, amoled, amoledExtreme }

/// Resolves the active palette from settings.
///
/// `appearance.palette` holds a preset id, or [AppPalette.customId].
/// A future custom theme stores its seed as an ARGB int in
/// `appearance.customSeed` (not a catalog row yet).
AppPalette paletteFromSettings(Map<String, Object?> settings) {
  final id = settings['appearance.palette'];
  if (id == AppPalette.customId) {
    final seed = colorFromStored(settings['appearance.customSeed']);
    if (seed != null) return AppPalette.custom(seed);
  }
  return AppPalette.byId(id is String ? id : null);
}

Color? colorFromStored(Object? raw) {
  if (raw is int) return Color(raw);
  if (raw is String) {
    final parsed = int.tryParse(raw);
    if (parsed != null) return Color(parsed);
  }
  return null;
}

ThemeMode themeModeFromSetting(Object? value) {
  switch (value) {
    case 'light':
      return ThemeMode.light;
    case 'dark':
      return ThemeMode.dark;
    default:
      return ThemeMode.system;
  }
}

SurfaceTreatment surfaceFromSetting(Object? value) {
  switch (value) {
    case 'amoled':
      return SurfaceTreatment.amoled;
    case 'amoled_extreme':
      return SurfaceTreatment.amoledExtreme;
    default:
      return SurfaceTreatment.standard;
  }
}

class AppStatusColors extends ThemeExtension<AppStatusColors> {
  final Color success;
  final Color warning;
  final Color danger;
  final Color info;

  const AppStatusColors({
    required this.success,
    required this.warning,
    required this.danger,
    required this.info,
  });

  static const fallback = AppStatusColors(
    success: AppColors.success,
    warning: AppColors.warning,
    danger: AppColors.danger,
    info: AppColors.info,
  );

  @override
  AppStatusColors copyWith({
    Color? success,
    Color? warning,
    Color? danger,
    Color? info,
  }) {
    return AppStatusColors(
      success: success ?? this.success,
      warning: warning ?? this.warning,
      danger: danger ?? this.danger,
      info: info ?? this.info,
    );
  }

  @override
  AppStatusColors lerp(AppStatusColors? other, double t) {
    if (other == null) return this;
    return AppStatusColors(
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      info: Color.lerp(info, other.info, t)!,
    );
  }
}

extension AppStatusColorsContext on BuildContext {
  AppStatusColors get statusColors =>
      Theme.of(this).extension<AppStatusColors>() ?? AppStatusColors.fallback;
}

class AppTheme {
  static const pageTransitionsTheme = PageTransitionsTheme(
    builders: {
      TargetPlatform.android: PredictiveBackPageTransitionsBuilder(),
      TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
      TargetPlatform.linux: FadeUpwardsPageTransitionsBuilder(),
      TargetPlatform.windows: FadeUpwardsPageTransitionsBuilder(),
    },
  );

  static ThemeData build({
    required Brightness brightness,
    required AppPalette palette,
    required SurfaceTreatment surface,
  }) {
    var scheme = _withBrandTint(
      ColorScheme.fromSeed(
        seedColor: palette.seed,
        brightness: brightness,
        dynamicSchemeVariant: DynamicSchemeVariant.fidelity,
      ),
      palette.seed,
    );
    if (brightness == Brightness.dark &&
        surface != SurfaceTreatment.standard) {
      scheme = _applyAmoled(scheme, surface);
    }

    final baseText = brightness == Brightness.light
        ? ThemeData.light().textTheme
        : ThemeData.dark().textTheme;

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      pageTransitionsTheme: pageTransitionsTheme,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      extensions: const [AppStatusColors.fallback],
      textTheme: baseText.apply(
        bodyColor: scheme.onSurface,
        displayColor: scheme.onSurface,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surfaceContainerHighest,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: scheme.surfaceContainerLow,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          foregroundColor: scheme.onPrimary,
          backgroundColor: scheme.primary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        ),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surface,
        modalBackgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        showDragHandle: true,
        dragHandleColor: scheme.outline,
        clipBehavior: Clip.antiAlias,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: scheme.surfaceContainerHigh,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      scrollbarTheme: ScrollbarThemeData(
        thickness: const WidgetStatePropertyAll(AppScrollbarTokens.thickness),
        trackVisibility: const WidgetStatePropertyAll(false),
        interactive: true,
        radius: AppScrollbarTokens.radius,
        minThumbLength: AppScrollbarTokens.minThumbLength,
      ),
    );
  }

  /// Keeps the seed hue and applies the saturation/lightness of the original
  /// Novyse roles. Mixing neutrals into the raw seed was pushing chroma too high.
  static ColorScheme _withBrandTint(ColorScheme scheme, Color seed) {
    final hue = HSLColor.fromColor(seed).hue;
    final accentHue = (hue - 18 + 360) % 360;
    Color tone(double saturation, double lightness) =>
        HSLColor.fromAHSL(1, hue, saturation, lightness).toColor();

    final light = scheme.brightness == Brightness.light;
    if (light) {
      return scheme.copyWith(
        primary: seed,
        onPrimary: Colors.white,
        primaryContainer: tone(1, 0.676),
        secondary: HSLColor.fromAHSL(1, accentHue, 1, 0.706).toColor(),
        surface: tone(1, 0.980),
        surfaceDim: tone(1, 0.960),
        surfaceBright: tone(1, 0.990),
        surfaceContainerLowest: tone(1, 0.992),
        surfaceContainerLow: tone(1, 0.972),
        surfaceContainer: tone(1, 0.966),
        surfaceContainerHigh: tone(1, 0.962),
        surfaceContainerHighest: tone(1, 0.959),
        onSurface: tone(0.462, 0.102),
        onSurfaceVariant: tone(0.194, 0.404),
        outline: tone(0.810, 0.918),
        outlineVariant: tone(0.70, 0.940),
      );
    }
    return scheme.copyWith(
      primary: tone(1, 0.676),
      onPrimary: Colors.white,
      primaryContainer: tone(0.984, 0.253),
      secondary: HSLColor.fromAHSL(1, accentHue, 1, 0.706).toColor(),
      surface: tone(0.696, 0.090),
      surfaceDim: tone(0.70, 0.060),
      surfaceBright: tone(0.55, 0.160),
      surfaceContainerLowest: tone(0.70, 0.060),
      surfaceContainerLow: tone(0.66, 0.110),
      surfaceContainer: tone(0.60, 0.130),
      surfaceContainerHigh: tone(0.56, 0.140),
      surfaceContainerHighest: tone(0.532, 0.151),
      onSurface: tone(1, 0.959),
      onSurfaceVariant: tone(0.690, 0.835),
      outline: tone(0.473, 0.216),
      outlineVariant: tone(0.40, 0.180),
    );
  }

  static ColorScheme _applyAmoled(ColorScheme scheme, SurfaceTreatment surface) {
    const black = Color(0xFF000000);
    if (surface == SurfaceTreatment.amoledExtreme) {
      return scheme.copyWith(
        surface: black,
        surfaceDim: black,
        surfaceBright: const Color(0xFF0A0A0A),
        surfaceContainerLowest: black,
        surfaceContainerLow: black,
        surfaceContainer: black,
        surfaceContainerHigh: black,
        surfaceContainerHighest: const Color(0xFF0A0A0A),
        outline: const Color(0xFF2C2C2C),
        outlineVariant: const Color(0xFF1A1A1A),
      );
    }
    return scheme.copyWith(
      surface: black,
      surfaceDim: black,
      surfaceContainerLowest: black,
      surfaceContainerLow: const Color(0xFF0C0C0C),
      surfaceContainer: const Color(0xFF121212),
      surfaceContainerHigh: const Color(0xFF1A1A1A),
      surfaceContainerHighest: const Color(0xFF222222),
    );
  }
}
