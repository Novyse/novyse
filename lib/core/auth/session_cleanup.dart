import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

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
  Future<void> step(String name, FutureOr<void> Function() fn) async {
    try {
      await fn();
    } catch (e) {
      debugPrint('[logout-cleanup] $name failed: $e');
    }
  }

  // 1. Stop anything that would hit the API with an invalid token.
  await step('cancel-sync-retry', () async {
    ref.read(syncServiceProvider).cancelRetry();
  });
  await step('close-socket', () async {
    ref.read(socketServiceProvider).close();
  });

  // 2. Notifications + push token.
  await step('reset-notifications', NotificationManager.instance.reset);
  await step('unregister-fcm', FcmService.instance.unregister);

  // 3. In-memory Riverpod state.
  await step('clear-chat-list', () async {
    ref.read(chatListProvider.notifier).clear();
  });
  await step('clear-users', () async {
    ref.read(userStoreProvider.notifier).clear();
  });
  await step('clear-active-chat', () async {
    ref.read(activeChatProvider.notifier).clear();
  });
  await step('clear-status', () async {
    ref.read(statusProvider.notifier).clearAll();
  });
  await step('reset-forward', () async {
    ref.read(forwardProvider.notifier).resetForwarding();
  });
  await step('reset-network', () async {
    ref.read(networkProvider.notifier).setSynced(false);
  });
  await step('invalidate-messages', () async {
    ref.invalidate(chatMessagesProvider);
  });
  await step('invalidate-drafts', () async {
    ref.invalidate(chatDraftProvider);
  });
  await step('invalidate-controllers', () async {
    ref.invalidate(chatTextControllerProvider);
  });
  await step('invalidate-favorites', () async {
    ref.invalidate(favoriteMessagesProvider);
  });
  await step('invalidate-settings', () async {
    ref.invalidate(settingsControllerProvider);
  });

  // 4. Persistent storage (SQLite + downloaded files).
  await step('delete-user-data', () async {
    final userUUID =
        AppDatabase.instance.currentUserUUID ??
        await const FlutterSecureStorage().read(key: 'userUUID');
    if (userUUID != null) {
      await ref.read(databaseProvider).deleteDatabaseForUser(userUUID);
      await ref.read(fileStorageProvider).clearForUser(userUUID);
    } else {
      await ref.read(databaseProvider).close();
    }
  });
  await step('clear-file-user', () async {
    ref.read(fileStorageProvider).setCurrentUser(null);
  });
}

Future<void> performLogout(WidgetRef ref) async {
  await runLogoutCleanup(ref);
  await ref.read(authProvider.notifier).logout();
}
