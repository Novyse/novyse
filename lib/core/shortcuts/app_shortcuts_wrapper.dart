import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/shortcuts/app_shortcuts.dart';

/// Wraps the application to handle global keyboard shortcuts across all platforms.
///
/// Supported global shortcuts:
/// - `Ctrl + W` / `Cmd + W`: Closes Novyse (or hides to system tray based on settings).
class AppShortcutsWrapper extends ConsumerWidget {
  const AppShortcutsWrapper({
    super.key,
    required this.child,
    this.onCloseApp,
  });

  final Widget child;
  final VoidCallback? onCloseApp;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.keyW, control: true): () {
          if (onCloseApp != null) {
            onCloseApp!();
          } else {
            AppShortcuts.closeApp(ref);
          }
        },
        const SingleActivator(LogicalKeyboardKey.keyW, meta: true): () {
          if (onCloseApp != null) {
            onCloseApp!();
          } else {
            AppShortcuts.closeApp(ref);
          }
        },
      },
      child: Focus(
        autofocus: true,
        child: child,
      ),
    );
  }
}
