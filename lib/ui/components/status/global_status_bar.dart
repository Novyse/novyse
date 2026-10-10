import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/stores/status_store.dart';

import 'status_message.dart';

/// Reactive global status bar that displays the current highest-priority status notification.
class GlobalStatusBar extends ConsumerWidget implements PreferredSizeWidget {
  const GlobalStatusBar({
    super.key,
    this.padding = const EdgeInsets.symmetric(horizontal: 16),
    this.height = 76,
  });

  final EdgeInsetsGeometry padding;
  final double height;

  @override
  Size get preferredSize => Size.fromHeight(height);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(activeStatusProvider);

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 250),
      reverseDuration: const Duration(milliseconds: 200),
      transitionBuilder: (child, animation) {
        return SizeTransition(
          sizeFactor: animation,
          alignment: Alignment.topCenter,
          child: FadeTransition(opacity: animation, child: child),
        );
      },
      child: status != null
          ? Padding(
              key: ValueKey(status.id),
              padding: padding,
              child: StatusMessage(
                type: status.type,
                title: status.title,
                titleBuilder: status.titleBuilder,
                content: status.content,
                contentBuilders: status.contentBuilders,
                progress: status.progress,
                closable: status.closable,
                actionLabel: status.actionLabel,
                actionLabelBuilder: status.actionLabelBuilder,
                onAction: status.onAction,
                onClose: () {
                  ref.read(statusProvider.notifier).dismissStatus(status.id);
                },
              ),
            )
          : const SizedBox.shrink(key: ValueKey('empty_status')),
    );
  }
}
