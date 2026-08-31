import 'package:flutter/material.dart';

/// Styled modal dialog. Visual tokens live in [ThemeData.dialogTheme].
class OverlayDialog extends StatelessWidget {
  const OverlayDialog({super.key, this.child});

  final Widget? child;

  static Future<T?> show<T>(BuildContext context, {Widget? child}) {
    return showDialog<T>(
      context: context,
      useRootNavigator: true,
      builder: (context) => OverlayDialog(child: child),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Dialog(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child:
            child ??
            Text(
              'Empty',
              style: theme.textTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
      ),
    );
  }
}
