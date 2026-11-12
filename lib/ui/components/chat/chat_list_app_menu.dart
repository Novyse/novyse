import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu_item.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class ChatListAppMenu extends StatelessWidget {
  const ChatListAppMenu({super.key, required this.onNewChat});

  final VoidCallback onNewChat;

  Future<void> _openMenu(BuildContext context) async {
    final l10n = context.l10n;
    final box = context.findRenderObject() as RenderBox?;
    final overlay =
        Overlay.of(context, rootOverlay: true).context.findRenderObject()
            as RenderBox?;
    if (box == null || overlay == null) return;

    const menuWidth = 200.0;
    const estimatedHeight =
        AppMenuTokens.padding * 2 + AppMenuTokens.itemHeight;

    final topLeft = box.localToGlobal(Offset.zero, ancestor: overlay);
    final size = box.size;
    final anchor = Offset(
      topLeft.dx + size.width - menuWidth,
      topLeft.dy + size.height,
    );

    await showAppMenu(
      context: context,
      anchor: anchor,
      width: menuWidth,
      estimatedHeight: estimatedHeight,
      builder: (close) => Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AppMenuItem(
            label: l10n.newChat,
            icon: HugeIcons.strokeRoundedCommentAdd01,
            onTap: () {
              close();
              onNewChat();
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FloatingIconButton(
      icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedMoreVertical),
      tooltip: context.l10n.more,
      onPressed: () => _openMenu(context),
    );
  }
}
