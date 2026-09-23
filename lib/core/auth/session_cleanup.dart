import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/auth/onboarding_manager.dart';
import 'package:novyse/core/notifications/fcm_service.dart';
import 'package:novyse/core/notifications/notification_manager.dart';
import 'package:novyse/core/services/socket_service.dart';
import 'package:novyse/core/services/sync_service.dart';
import 'package:novyse/core/settings/settings_controller.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/storage/file/file_storage.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/favorite_messages_store.dart';
import 'package:novyse/core/stores/forward_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/network_store.dart';
import 'package:novyse/core/stores/status_store.dart';
import 'package:novyse/core/stores/user_store.dart';

/// Wipes all per-user state (in-memory + on-disk) on logout.
Future<void> runLogoutCleanup(WidgetRef ref) async {
  // 1. Stop anything that would hit the API with an invalid token.
  try {
    ref.read(syncServiceProvider).cancelRetry();
  } catch (_) {}
  try {
    ref.read(socketServiceProvider).close();
  } catch (_) {}

  // 2. Notifications + push token.
  try {
    await NotificationManager.instance.reset();
  } catch (_) {}
  try {
    await FcmService.instance.unregister();
  } catch (_) {}

  // 3. In-memory Riverpod state.
  try {
    ref.read(chatListProvider.notifier).clear();
  } catch (_) {}
  try {
    ref.read(userStoreProvider.notifier).clear();
  } catch (_) {}
  try {
    ref.read(activeChatProvider.notifier).clear();
  } catch (_) {}
  try {
    ref.read(statusProvider.notifier).clearAll();
  } catch (_) {}
  try {
    ref.read(forwardProvider.notifier).resetForwarding();
  } catch (_) {}
  try {
    ref.read(networkProvider.notifier).setSynced(false);
  } catch (_) {}
  try {
    ref.invalidate(chatMessagesProvider);
  } catch (_) {}
  try {
    ref.invalidate(chatDraftProvider);
  } catch (_) {}
  try {
    ref.invalidate(chatTextControllerProvider);
  } catch (_) {}
  try {
    ref.invalidate(favoriteMessagesProvider);
  } catch (_) {}
  try {
    ref.invalidate(settingsControllerProvider);
  } catch (_) {}

  // 4. Persistent storage (SQLite + downloaded files).
  try {
    await ref.read(databaseProvider).clear();
  } catch (_) {}
  try {
    await ref.read(fileStorageProvider).clearAll();
  } catch (_) {}
}

Future<void> performLogout(WidgetRef ref) async {
  await runLogoutCleanup(ref);
  await ref.read(authProvider.notifier).logout();
}
