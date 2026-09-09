import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class ChatDetailSearchAppBar extends StatelessWidget {
  const ChatDetailSearchAppBar({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.onQueryChanged,
    required this.onClose,
    required this.totalResults,
    required this.currentIndex,
    required this.onNext,
    required this.onPrevious,
    this.bottom,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onQueryChanged;
  final VoidCallback onClose;
  final int totalResults;
  final int currentIndex;
  final VoidCallback onNext;
  final VoidCallback onPrevious;
  final Widget? bottom;

  static const _pillSpacing = 8.0;

  Widget _pill({
    required ColorScheme scheme,
    required Widget child,
    EdgeInsetsGeometry padding = EdgeInsets.zero,
    double radius = 100,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: scheme.surface.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(color: scheme.outline.withValues(alpha: 0.25)),
          ),
          child: child,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final hasResults = totalResults > 0;
    final hasQuery = controller.text.isNotEmpty;

    final content = Row(
      children: [
        _pill(
          scheme: colorScheme,
          padding: const EdgeInsets.all(2),
          child: IconButton(
            icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedCancel01),
            tooltip: l10n.cancel,
            onPressed: onClose,
          ),
        ),
        const SizedBox(width: _pillSpacing),
        Expanded(
          child: _pill(
            scheme: colorScheme,
            radius: 28,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: TextField(
              controller: controller,
              focusNode: focusNode,
              autofocus: true,
              textInputAction: TextInputAction.search,
              onChanged: onQueryChanged,
              onSubmitted: (_) {
                if (hasResults) onNext();
              },
              decoration: InputDecoration(
                hintText: l10n.searchHint,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                isDense: true,
                filled: false,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                suffixIconConstraints: const BoxConstraints(
                  minWidth: 32,
                  minHeight: 32,
                ),
                suffixIcon: hasQuery
                    ? IconButton(
                        icon: const AppHugeIcon(
                          icon: HugeIcons.strokeRoundedCancel01,
                          size: 18,
                        ),
                        onPressed: () {
                          controller.clear();
                          onQueryChanged('');
                        },
                      )
                    : null,
              ),
            ),
          ),
        ),
        const SizedBox(width: _pillSpacing),
        _pill(
          scheme: colorScheme,
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Text(
                    hasResults ? '${currentIndex + 1}/$totalResults' : '0/0',
                    style: TextStyle(
                      fontSize: 13,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ),
              IconButton(
                icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedArrowUp01),
                onPressed: hasResults ? onPrevious : null,
              ),
              IconButton(
                icon: const AppHugeIcon(
                  icon: HugeIcons.strokeRoundedArrowDown01,
                ),
                onPressed: hasResults ? onNext : null,
              ),
            ],
          ),
        ),
      ],
    );

    return ProgressiveOpacityBackground(
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              content,
              if (bottom != null) ...[const SizedBox(height: 8), bottom!],
            ],
          ),
        ),
      ),
    );
  }
}
