import 'package:flutter/material.dart';

class AppColors {
  static const Color primary = Color(0xFF0F6FFF);
  static const Color primaryLight = Color(0xFF5AA7FF);
  static const Color primaryDark = Color(0xFF0A4DB8);
  static const Color accent = Color(0xFF69D2FF);
  static const Color surface = Color(0xFFF5FAFF);
  static const Color surfaceAlt = Color(0xFFEAF4FF);
  static const Color textPrimary = Color(0xFF0E1726);
  static const Color textSecondary = Color(0xFF53677B);
  static const Color border = Color(0xFFD9EAFB);
  static const Color success = Color(0xFF1DBF73);
  static const Color warning = Color(0xFFFFC857);
  static const Color danger = Color(0xFFE45757);
}

class AppTheme {
  static ThemeData get light {
    final lightScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.light,
      primary: AppColors.primary,
      primaryContainer: AppColors.primaryLight,
      secondary: AppColors.accent,
      surface: AppColors.surface,
      surfaceContainerHighest: AppColors.surfaceAlt,
      onPrimary: Colors.white,
      onSurface: AppColors.textPrimary,
      onSurfaceVariant: AppColors.textSecondary,
      outline: AppColors.border,
      outlineVariant: AppColors.border,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: lightScheme,
      scaffoldBackgroundColor: AppColors.surface,
      textTheme: ThemeData.light().textTheme.apply(
        bodyColor: AppColors.textPrimary,
        displayColor: AppColors.textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceAlt,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: AppColors.primary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        ),
      ),
    );
  }

  static ThemeData get dark {
    final darkScheme = ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: Brightness.dark,
      primary: AppColors.primaryLight,
      primaryContainer: AppColors.primaryDark,
      secondary: AppColors.accent,
      surface: const Color(0xFF071827),
      surfaceContainerHighest: const Color(0xFF12283B),
      onPrimary: Colors.white,
      onSurface: const Color(0xFFEAF4FF),
      onSurfaceVariant: const Color(0xFFB8D3F2),
      outline: const Color(0xFF1D3351),
      outlineVariant: const Color(0xFF1D3351),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: darkScheme,
      scaffoldBackgroundColor: const Color(0xFF071827),
      textTheme: ThemeData.dark().textTheme.apply(
        bodyColor: const Color(0xFFEAF4FF),
        displayColor: const Color(0xFFEAF4FF),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF071827),
        foregroundColor: Color(0xFFEAF4FF),
        elevation: 0,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF12283B),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          foregroundColor: Colors.white,
          backgroundColor: AppColors.primaryLight,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        ),
      ),
    );
  }
}
