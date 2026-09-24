import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final hasResults = totalResults > 0;
    final hasQuery = controller.text.isNotEmpty;

    final content = Row(
      children: [
        FloatingPill(
          padding: FloatingAppBarConsts.iconPillPadding,
          child: FloatingIconButton(
            icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedCancel01),
            tooltip: l10n.cancel,
            onPressed: onClose,
          ),
        ),
        const SizedBox(width: FloatingAppBarConsts.pillSpacing),
        Expanded(
          child: FloatingPill(
            radius: FloatingAppBarConsts.centralRadius,
            padding: FloatingAppBarConsts.searchFieldPadding,
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                minHeight: FloatingAppBarConsts.searchFieldHeight,
              ),
              child: Align(
                alignment: Alignment.centerLeft,
                child: TextField(
                  controller: controller,
                  focusNode: focusNode,
                  autofocus: true,
                  textInputAction: TextInputAction.search,
                  textAlignVertical: TextAlignVertical.center,
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
                    contentPadding: const EdgeInsets.symmetric(vertical: 8),
                    suffixIconConstraints: FloatingAppBarConsts
                        .searchClearConstraints,
                    suffixIcon: hasQuery
                        ? IconButton(
                            padding: EdgeInsets.zero,
                            constraints: FloatingAppBarConsts
                                .searchClearConstraints,
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
          ),
        ),
        const SizedBox(width: FloatingAppBarConsts.pillSpacing),
        FloatingPill(
          padding: FloatingAppBarConsts.actionsPadding,
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
              FloatingIconButton(
                icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedArrowUp01),
                onPressed: hasResults ? onPrevious : null,
              ),
              FloatingIconButton(
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          content,
          if (bottom != null) ...[
            const SizedBox(height: FloatingAppBarConsts.bottomGap),
            bottom!,
          ],
        ],
      ),
    );
  }
}
