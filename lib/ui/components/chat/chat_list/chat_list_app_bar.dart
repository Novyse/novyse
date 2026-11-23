import 'package:material_ui/material_ui.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/chat_list_app_menu.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';
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
    this.footer,
    this.selecting = false,
    this.selectedCount = 0,
    this.selectedPinned = false,
    this.onCloseSelection,
    this.onTogglePinSelected,
  });

  final bool searching;
  final TextEditingController searchController;
  final FocusNode searchFocusNode;
  final ValueChanged<String> onQueryChanged;
  final VoidCallback onOpenSearch;
  final VoidCallback onCloseSearch;
  final VoidCallback onNewChat;
  final Widget? footer;
  final bool selecting;
  final int selectedCount;
  final bool selectedPinned;
  final VoidCallback? onCloseSelection;
  final VoidCallback? onTogglePinSelected;

  @override
  Widget build(BuildContext context) {
    final Widget content;
    if (selecting) {
      final l10n = AppLocalizations.of(context)!;

      content = Row(
        children: [
          FloatingPill(
            padding: FloatingConsts.iconPillPadding,
            child: FloatingIconButton(
              icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedCancel01),
              tooltip: l10n.cancel,
              onPressed: onCloseSelection,
            ),
          ),
          const SizedBox(width: FloatingConsts.pillSpacing),
          Expanded(
            child: FloatingPill(
              radius: FloatingConsts.centralRadius,
              padding: const EdgeInsets.fromLTRB(
                16,
                FloatingConsts.barInset,
                FloatingConsts.barInset,
                FloatingConsts.barInset,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      l10n.selectedCount(selectedCount),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  FloatingIconButton(
                    icon: AppHugeIcon(
                      icon: selectedPinned
                          ? HugeIcons.strokeRoundedPinOff
                          : HugeIcons.strokeRoundedPin02,
                    ),
                    tooltip: selectedPinned ? l10n.unpin : l10n.pin,
                    onPressed: onTogglePinSelected,
                  ),
                ],
              ),
            ),
          ),
        ],
      );
    } else if (searching) {
      final l10n = AppLocalizations.of(context)!;
      final hasQuery = searchController.text.isNotEmpty;

      content = Row(
        children: [
          FloatingPill(
            padding: FloatingConsts.iconPillPadding,
            child: FloatingIconButton(
              icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedCancel01),
              tooltip: l10n.cancel,
              onPressed: onCloseSearch,
            ),
          ),
          const SizedBox(width: FloatingConsts.pillSpacing),
          Expanded(
            child: FloatingPill(
              radius: FloatingConsts.centralRadius,
              padding: FloatingConsts.searchFieldPadding,
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  minHeight: FloatingConsts.searchFieldHeight,
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
                      suffixIconConstraints:
                          FloatingConsts.searchClearConstraints,
                      suffixIcon: hasQuery
                          ? IconButton(
                              padding: EdgeInsets.zero,
                              constraints:
                                  FloatingConsts.searchClearConstraints,
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
            padding: FloatingConsts.iconPillPadding,
            child: FloatingIconButton(
              icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedSearch01),
              onPressed: onOpenSearch,
            ),
          ),
          const Spacer(),
          FloatingPill(
            padding: FloatingConsts.iconPillPadding,
            child: ChatListAppMenu(onNewChat: onNewChat),
          ),
        ],
      );
    }

    return ProgressiveOpacityBackground(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [content, ?footer],
      ),
    );
  }
}
