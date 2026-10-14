library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/global.dart' as config;
import '../events/event_bus.dart';
import '../events/events.dart';
import '../l10n/l10n.dart';
import '../services/api_gateway.dart';

/// Compares two version strings by numeric segments.
///
/// Non-numeric separators (`.`, `-`, `_`, ...) are ignored, so build-tagged
/// versions such as `1.3.0-20261013.0` compare correctly. Returns a negative
/// number when [a] < [b], zero when equal, positive when [a] > [b].
int compareVersions(String a, String b) {
  final segA = RegExp(r'\d+').allMatches(a).map((m) => int.parse(m.group(0)!));
  final segB = RegExp(r'\d+').allMatches(b).map((m) => int.parse(m.group(0)!));
  final listA = segA.toList();
  final listB = segB.toList();
  final len = listA.length > listB.length ? listA.length : listB.length;
  for (var i = 0; i < len; i++) {
    final x = i < listA.length ? listA[i] : 0;
    final y = i < listB.length ? listB[i] : 0;
    if (x != y) return x.compareTo(y);
  }
  return 0;
}

/// Manual "check for updates" triggered from Settings.
///
/// Pulls the latest version from `/health` and compares it with the running
/// build. When outdated it emits [ClientUpdateRequiredEvent], letting the
/// global receiver auto-navigate to `/updateRequired` through the same
/// pipeline as the 426 interceptor. Otherwise it reports the outcome with a
/// snackbar. Always returns true (handled).
Future<bool> handleManualUpdateCheck(
  WidgetRef ref,
  BuildContext context,
) async {
  final l10n = AppLocalizations.of(context)!;
  final checkingMsg = l10n.updaterChecking;
  final upToDateMsg = l10n.updaterNoUpdate;
  final failedMsg = l10n.updaterCheckFailed;
  final messenger = ScaffoldMessenger.of(context);

  messenger.showSnackBar(SnackBar(content: Text(checkingMsg)));

  final result = await ref.read(apiGatewayProvider).system.getVersion();
  if (!context.mounted) return true;

  if (!result.success || result.version == null) {
    messenger.showSnackBar(SnackBar(content: Text(failedMsg)));
    return true;
  }
  if (compareVersions(config.appVersion, result.version!) < 0) {
    eventBus.emit(ClientUpdateRequiredEvent(minVersion: result.version));
    return true;
  }
  messenger.showSnackBar(SnackBar(content: Text(upToDateMsg)));
  return true;
}
