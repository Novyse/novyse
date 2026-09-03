import 'package:flutter/material.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/chat_list_app_menu.dart';

class ChatListAppBar extends StatelessWidget implements PreferredSizeWidget {
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

  static const _appBarEdgePadding = 8.0;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    if (searching) {
      final l10n = AppLocalizations.of(context)!;
      final colorScheme = Theme.of(context).colorScheme;
      final fieldBorder = OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: BorderSide.none,
      );

      return AppBar(
        automaticallyImplyLeading: false,
        scrolledUnderElevation: 0,
        titleSpacing: 8,
        actionsPadding: const EdgeInsets.only(right: _appBarEdgePadding),
        title: TextField(
          controller: searchController,
          focusNode: searchFocusNode,
          textInputAction: TextInputAction.search,
          onChanged: onQueryChanged,
          decoration: InputDecoration(
            hintText: l10n.searchHint,
            isDense: true,
            filled: true,
            fillColor: colorScheme.surfaceContainerHighest.withValues(
              alpha: 0.55,
            ),
            prefixIcon: const Icon(Icons.search, size: 20),
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
        actions: [
          IconButton(icon: const Icon(Icons.close), onPressed: onCloseSearch),
        ],
      );
    }

    return AppBar(
      automaticallyImplyLeading: false,
      scrolledUnderElevation: 0,
      titleSpacing: 8,
      leading: IconButton(icon: const Icon(Icons.search), onPressed: onOpenSearch),
      actionsPadding: const EdgeInsets.only(right: _appBarEdgePadding),
      actions: [ChatListAppMenu(onNewChat: onNewChat)],
    );
  }
}
