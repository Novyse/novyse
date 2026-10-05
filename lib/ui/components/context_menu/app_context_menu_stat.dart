import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class AppMenuStat extends StatelessWidget {
  const AppMenuStat({super.key, required this.icon, required this.text});

  final List<List<dynamic>> icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppMenuTokens.borderRadius),
      child: BackdropFilter(
        filter: ImageFilter.blur(
          sigmaX: AppMenuTokens.blurSigma,
          sigmaY: AppMenuTokens.blurSigma,
        ),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.88),
            borderRadius: BorderRadius.circular(AppMenuTokens.borderRadius),
            border: Border.all(
              color: colorScheme.outlineVariant.withValues(alpha: 0.35),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AppHugeIcon(icon: icon, size: 16, color: colorScheme.onSurface),
              const SizedBox(width: 6),
              Text(
                text,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
