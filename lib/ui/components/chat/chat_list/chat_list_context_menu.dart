import 'package:material_ui/material_ui.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu_item.dart';

/// Context Menu shown at right click on a chat
Future<void> showChatListContextMenu({
  required BuildContext context,
  required Offset anchor,
  required bool isPinned,
  VoidCallback? onTogglePin,
}) {
  final l10n = AppLocalizations.of(context)!;

  const menuWidth = 200.0;
  const estimatedHeight = AppMenuTokens.padding * 2 + AppMenuTokens.itemHeight;

  return showAppMenu(
    context: context,
    anchor: anchor,
    width: menuWidth,
    estimatedHeight: estimatedHeight,
    builder: (close) => Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppMenuItem(
          label: isPinned ? l10n.unpin : l10n.pin,
          icon: isPinned
              ? HugeIcons.strokeRoundedPinOff
              : HugeIcons.strokeRoundedPin02,
          onTap: () {
            close();
            onTogglePin?.call();
          },
        ),
      ],
    ),
  );
}
