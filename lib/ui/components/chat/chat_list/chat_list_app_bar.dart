import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/chat/chat_list_app_menu.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';
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

  @override
  Widget build(BuildContext context) {
    final Widget content;
    if (searching) {
      final l10n = AppLocalizations.of(context)!;
      final hasQuery = searchController.text.isNotEmpty;

      content = Row(
        children: [
          FloatingPill(
            padding: FloatingAppBarConsts.iconPillPadding,
            child: FloatingIconButton(
              icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedCancel01),
              tooltip: l10n.cancel,
              onPressed: onCloseSearch,
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
                    controller: searchController,
                    focusNode: searchFocusNode,
                    autofocus: true,
                    textInputAction: TextInputAction.search,
                    textAlignVertical: TextAlignVertical.center,
                    onChanged: onQueryChanged,
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
                                searchController.clear();
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
        ],
      );
    } else {
      content = Row(
        children: [
          FloatingPill(
            padding: FloatingAppBarConsts.iconPillPadding,
            child: FloatingIconButton(
              icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedSearch01),
              onPressed: onOpenSearch,
            ),
          ),
          const Spacer(),
          FloatingPill(
            padding: FloatingAppBarConsts.iconPillPadding,
            child: ChatListAppMenu(onNewChat: onNewChat),
          ),
        ],
      );
    }

    return ProgressiveOpacityBackground(child: content);
  }
}
