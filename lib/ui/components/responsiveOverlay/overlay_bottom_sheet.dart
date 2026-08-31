import 'package:flutter/material.dart';

/// Styled modal bottom sheet. Visual tokens live in [ThemeData.bottomSheetTheme].
class OverlayBottomSheet extends StatelessWidget {
  const OverlayBottomSheet({super.key, this.child});

  final Widget? child;

  static Future<T?> show<T>(BuildContext context, {Widget? child}) {
    return showModalBottomSheet<T>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      builder: (context) => OverlayBottomSheet(child: child),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SafeArea(
      child: SizedBox(
        width: double.infinity,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child:
              child ??
              Text(
                'ciao',
                style: theme.textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
        ),
      ),
    );
  }
}
