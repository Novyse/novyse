import 'package:flutter/material.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';

/// Homogeneous confirm content used inside [ResponsiveOverlay].
///
/// Always shown as a modal dialog (never a bottom sheet).
class OverlayConfirmContent extends StatelessWidget {
  const OverlayConfirmContent({
    super.key,
    this.title,
    this.message,
    required this.confirmLabel,
    this.cancelLabel,
    this.isDanger = false,
  });

  final String? title;
  final String? message;
  final String confirmLabel;
  final String? cancelLabel;
  final bool isDanger;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (title != null && title!.isNotEmpty)
          Text(
            title!,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        if (message != null && message!.isNotEmpty) ...[
          if (title != null && title!.isNotEmpty) const SizedBox(height: 8),
          Text(
            message!,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurfaceVariant,
              height: 1.4,
            ),
          ),
        ],
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: AppButton(
                label: cancelLabel ?? 'Cancel',
                onPressed: () =>
                    Navigator.of(context, rootNavigator: true).pop(false),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AppButton(
                label: confirmLabel,
                variant: isDanger
                    ? AppButtonVariant.danger
                    : AppButtonVariant.primary,
                onPressed: () =>
                    Navigator.of(context, rootNavigator: true).pop(true),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// Shows a homogeneous confirm via [ResponsiveOverlay].
/// Returns true when confirmed, false/null otherwise.
///
/// Confirms always use [ResponsiveOverlayMode.modal]: even on mobile a
/// centered dialog reads better than a full-width bottom sheet for a
/// two-button confirmation.
Future<bool> showOverlayConfirm(
  BuildContext context, {
  String? title,
  String? message,
  required String confirmLabel,
  String? cancelLabel,
  bool isDanger = false,
  ResponsiveOverlayMode mode = ResponsiveOverlayMode.modal,
}) async {
  final result = await ResponsiveOverlay.show<bool>(
    context: context,
    mode: mode,
    child: OverlayConfirmContent(
      title: title,
      message: message,
      confirmLabel: confirmLabel,
      cancelLabel: cancelLabel,
      isDanger: isDanger,
    ),
  );
  return result == true;
}
