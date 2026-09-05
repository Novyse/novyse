import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class ChatDetailSearchAppBar extends StatelessWidget
    implements PreferredSizeWidget {
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
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onQueryChanged;
  final VoidCallback onClose;
  final int totalResults;
  final int currentIndex;
  final VoidCallback onNext;
  final VoidCallback onPrevious;

  static const _appBarEdgePadding = 8.0;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final hasResults = totalResults > 0;
    final hasQuery = controller.text.isNotEmpty;
    final fieldBorder = OutlineInputBorder(
      borderRadius: BorderRadius.circular(20),
      borderSide: BorderSide.none,
    );

    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      automaticallyImplyLeading: false,
      leading: IconButton(
        icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedCancel01),
        tooltip: l10n.cancel,
        onPressed: onClose,
      ),
      titleSpacing: 0,
      title: TextField(
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
          isDense: true,
          filled: true,
          fillColor: colorScheme.surfaceContainerHighest.withValues(
            alpha: 0.55,
          ),
          prefixIconConstraints: const BoxConstraints(
            minWidth: 48,
            minHeight: 48,
          ),
          prefixIcon: Padding(
            padding: const EdgeInsets.all(14),
            child: AppHugeIcon(
              icon: HugeIcons.strokeRoundedSearch01,
              size: 20,
              color: colorScheme.onSurfaceVariant,
            ),
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
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 10,
          ),
          border: fieldBorder,
          enabledBorder: fieldBorder,
          focusedBorder: fieldBorder.copyWith(
            borderSide: BorderSide(
              color: colorScheme.primary.withValues(alpha: 0.45),
            ),
          ),
        ),
      ),
      actionsPadding: const EdgeInsets.only(right: _appBarEdgePadding),
      actions: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Center(
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
          icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedArrowDown01),
          onPressed: hasResults ? onNext : null,
        ),
      ],
    );
  }
}
