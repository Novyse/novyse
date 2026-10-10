import 'package:flutter/material.dart';

/// Visual presets for [AppButton].
///
/// Add new cases here (e.g. `secondary`, `ghost`, `success`) and map them in
/// [getAppButtonStyle] — call sites stay unchanged.
enum AppButtonVariant { primary, danger }

class AppButtonColors {
  const AppButtonColors({required this.background, required this.foreground});

  final Color background;
  final Color foreground;
}

AppButtonColors getAppButtonStyle(ThemeData theme, AppButtonVariant variant) {
  final scheme = theme.colorScheme;
  return switch (variant) {
    AppButtonVariant.primary => AppButtonColors(
      background: Colors.transparent,
      foreground: scheme.primary,
    ),
    AppButtonVariant.danger => AppButtonColors(
      background: Colors.transparent,
      foreground: scheme.error,
    ),
  };
}

/// Single text-only button used across the app (modals, confirms, pages).
///
/// No icon, no border. Full-width by default ([expanded]); set
/// [expanded] to false for wrap-content (e.g. inside a [Row] with [Expanded]).
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.isLoading = false,
    this.expanded = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final bool isLoading;
  final bool expanded;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = getAppButtonStyle(theme, variant);
    final neutralOverlay = theme.colorScheme.onSurface;

    final button = TextButton(
      onPressed: isLoading ? null : onPressed,
      style:
          TextButton.styleFrom(
            backgroundColor: colors.background,
            foregroundColor: colors.foreground,
            disabledForegroundColor: colors.foreground.withValues(alpha: 0.5),
            elevation: 0,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(100),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            textStyle: theme.textTheme.labelLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ).copyWith(
            // Subtle neutral hover/pressed overlay
            overlayColor: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.pressed)) {
                return neutralOverlay.withValues(alpha: 0.1);
              }
              if (states.contains(WidgetState.hovered)) {
                return neutralOverlay.withValues(alpha: 0.06);
              }
              if (states.contains(WidgetState.focused)) {
                return neutralOverlay.withValues(alpha: 0.06);
              }
              return null;
            }),
          ),
      child: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 1),
            )
          : Text(label),
    );

    if (!expanded) {
      return SizedBox(height: 45, child: button);
    }
    return SizedBox(width: double.infinity, height: 45, child: button);
  }
}
