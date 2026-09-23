import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/auth/session_cleanup.dart';
import 'package:novyse/core/router/router.dart';

/// Executes a catalog action. Returns true when the action was handled
Future<bool> runSettingsAction(
  WidgetRef ref,
  BuildContext context,
  String actionId,
) async {
  switch (actionId) {
    case 'logout':
      await performLogout(ref);
      if (context.mounted) {
        ref.read(routerProvider).go('/welcome');
      }
      return true;
    default:
      return false;
  }
}
