import 'package:flutter/material.dart';

class AppMenuDivider extends StatelessWidget {
  const AppMenuDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      height: 1,
      margin: const EdgeInsets.symmetric(vertical: 10),
      color: colorScheme.outlineVariant.withValues(alpha: 0.7),
    );
  }
}
