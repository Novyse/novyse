import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Floating search field for the settings page.
///
/// Same pill style as [ChatListAppBar]'s searching state
/// (`FloatingPill` + `searchFieldPadding` + clear button); it replaces the
/// title row via [SettingsPageTemplate]'s `appBarContent` slot.
class SettingsSearchBar extends StatelessWidget {
  const SettingsSearchBar({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.onQueryChanged,
  });

  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onQueryChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final hasQuery = controller.text.isNotEmpty;

    return FloatingPill(
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
            decoration: InputDecoration(
              hintText: l10n.settingsSearchHint,
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              isDense: true,
              filled: false,
              contentPadding: const EdgeInsets.symmetric(vertical: 8),
              suffixIconConstraints:
                  FloatingAppBarConsts.searchClearConstraints,
              suffixIcon: hasQuery
                  ? IconButton(
                      padding: EdgeInsets.zero,
                      constraints:
                          FloatingAppBarConsts.searchClearConstraints,
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
    );
  }
}
