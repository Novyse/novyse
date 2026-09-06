import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/chat_list_app_menu.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class ChatListAppBar extends StatelessWidget {
  const ChatListAppBar({
    super.key,
    required this.searching,
    required this.searchController,
    required this.searchFocusNode,
    required this.onQueryChanged,
    required this.onOpenSearch,
    required this.onCloseSearch,
    required this.onNewChat,
  });

  final bool searching;
  final TextEditingController searchController;
  final FocusNode searchFocusNode;
  final ValueChanged<String> onQueryChanged;
  final VoidCallback onOpenSearch;
  final VoidCallback onCloseSearch;
  final VoidCallback onNewChat;

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
    final colorScheme = Theme.of(context).colorScheme;

    if (searching) {
      final l10n = AppLocalizations.of(context)!;
      final hasQuery = searchController.text.isNotEmpty;

      return Row(
        children: [
          _pill(
            scheme: colorScheme,
            padding: const EdgeInsets.all(2),
            child: IconButton(
              icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedCancel01),
              tooltip: l10n.cancel,
              onPressed: onCloseSearch,
            ),
          ),
          const SizedBox(width: _pillSpacing),
          Expanded(
            child: _pill(
              scheme: colorScheme,
              radius: 28,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: searchController,
                focusNode: searchFocusNode,
                autofocus: true,
                textInputAction: TextInputAction.search,
                onChanged: onQueryChanged,
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
                            searchController.clear();
                            onQueryChanged('');
                          },
                        )
                      : null,
                ),
              ),
            ),
          ),
        ],
      );
    }

    return Row(
      children: [
        _pill(
          scheme: colorScheme,
          padding: const EdgeInsets.all(2),
          child: IconButton(
            icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedSearch01),
            onPressed: onOpenSearch,
          ),
        ),
        const Spacer(),
        _pill(
          scheme: colorScheme,
          padding: const EdgeInsets.all(2),
          child: ChatListAppMenu(onNewChat: onNewChat),
        ),
      ],
    );
  }
}
