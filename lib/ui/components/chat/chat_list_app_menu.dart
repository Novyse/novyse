import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class ChatListAppMenu extends StatefulWidget {
  const ChatListAppMenu({super.key, required this.onNewChat});

  final VoidCallback onNewChat;

  @override
  State<ChatListAppMenu> createState() => _ChatListAppMenuState();
}

class _ChatListAppMenuState extends State<ChatListAppMenu> {
  final _buttonFocusNode = FocusNode(debugLabel: 'ChatListAppMenu');

  @override
  void dispose() {
    _buttonFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    return MenuAnchor(
      childFocusNode: _buttonFocusNode,
      style: MenuStyle(
        backgroundColor: const WidgetStatePropertyAll(Colors.transparent),
        surfaceTintColor: const WidgetStatePropertyAll(Colors.transparent),
        elevation: const WidgetStatePropertyAll(0),
        shadowColor: const WidgetStatePropertyAll(Colors.transparent),
        padding: const WidgetStatePropertyAll(EdgeInsets.only(right: 8)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
        alignment: AlignmentDirectional.bottomEnd,
      ),
      alignmentOffset: const Offset(0, 8),
      builder: (_, controller, child) {
        return IconButton(
          focusNode: _buttonFocusNode,
          icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedMoreVertical),
          tooltip: l10n.newChat,
          onPressed: () {
            if (controller.isOpen) {
              controller.close();
            } else {
              controller.open();
            }
          },
        );
      },
      menuChildren: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: scheme.outline.withValues(alpha: 0.4)),
            boxShadow: [
              BoxShadow(
                color: scheme.shadow.withValues(alpha: 0.2),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: MenuItemButton(
            style: ButtonStyle(
              shape: WidgetStatePropertyAll(
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              padding: const WidgetStatePropertyAll(
                EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              ),
            ),
            onPressed: () => widget.onNewChat(),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        scheme.primary.withValues(alpha: 0.22),
                        scheme.primary.withValues(alpha: 0.1),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(13),
                    border: Border.all(
                      color: scheme.primary.withValues(alpha: 0.22),
                    ),
                  ),
                  child: AppHugeIcon(
                    icon: HugeIcons.strokeRoundedCommentAdd01,
                    size: 20,
                    color: scheme.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    l10n.newChat,
                    style: textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                AppHugeIcon(
                  icon: HugeIcons.strokeRoundedArrowUpRight01,
                  size: 18,
                  color: scheme.onSurfaceVariant.withValues(alpha: 0.6),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
