import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/auth/onboarding_manager.dart';
import 'package:novyse/core/comms/comms_controller.dart';
import 'package:novyse/core/comms/comms_state.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/notifications/comms_notification_service.dart';
import 'package:novyse/core/notifications/notification_bridge.dart';
import 'package:novyse/core/notifications/notification_manager.dart';
import 'package:novyse/core/router/chat_routes.dart';
import 'package:novyse/core/router/router.dart';
import 'package:novyse/core/services/socket_service.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';

/// Binds [NotificationManager] to Riverpod stores and listens for inbound messages.
class NotificationBinder extends ConsumerStatefulWidget {
  const NotificationBinder({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<NotificationBinder> createState() => _NotificationBinderState();
}

class _NotificationBinderState extends ConsumerState<NotificationBinder>
    with WidgetsBindingObserver {
  void Function(dynamic)? _onMessageNew;
  bool _permissionRequestInFlight = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _wireManager();
    _onMessageNew = (data) {
      if (data is! Map) return;
      final message = Map<String, dynamic>.from(data);
      unawaited(NotificationManager.instance.handleInboundMessage(message));
    };
    GlobalEventEmitter.instance.on('message:new', _onMessageNew!);

    CommsNotificationService.instance.onSetAudio = (enabled) async {
      await ref.read(commsProvider.notifier).setAudioEnabled(enabled);
    };
    CommsNotificationService.instance.onToggleAudio = () async {
      await ref.read(commsProvider.notifier).toggleAudio();
    };
    CommsNotificationService.instance.onSetVideo = (enabled) async {
      await ref.read(commsProvider.notifier).setVideoEnabled(enabled);
    };
    CommsNotificationService.instance.onToggleVideo = () async {
      await ref.read(commsProvider.notifier).toggleVideo();
    };
    CommsNotificationService.instance.onLeave = () async {
      await ref.read(commsProvider.notifier).leave();
    };

    NotificationBridge.registerReceiver((message) async {
      final type = message['type'];
      if (type == 'comms_action') {
        final actionId = message['actionId'] as String?;
        if (actionId != null) {
          await CommsNotificationService.instance.executeAction(actionId);
        }
        return;
      }
      await GlobalEventEmitter.instance.message.add(message);
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_bootstrap());
    });
  }

  Future<void> _bootstrap() async {
    await NotificationManager.instance.init();
    _wireManager();
    _maybeRequestPermissions();
  }

  /// Only prompt for notifications when logged in
  void _maybeRequestPermissions() {
    bool loggedIn;
    try {
      loggedIn = ref.read(authProvider);
    } catch (_) {
      return;
    }
    if (!loggedIn || !mounted) return;
    unawaited(_requestPermissionsOnce());
  }

  Future<void> _requestPermissionsOnce() async {
    if (_permissionRequestInFlight) return;
    _permissionRequestInFlight = true;
    try {
      await NotificationManager.instance.requestPermissions();
    } catch (e) {
      debugPrint('[NotificationBinder] permission request failed: $e');
    } finally {
      _permissionRequestInFlight = false;
    }
  }

  void _wireManager() {
    final manager = NotificationManager.instance;
    manager.isSocketOpen = () {
      try {
        return ref.read(socketServiceProvider).isOpen;
      } catch (_) {
        return false;
      }
    };
    manager.activeChatUUID = () {
      try {
        final path = ref.read(routerProvider).state.uri.path;
        return chatUUIDFromPath(path);
      } catch (_) {
        return null;
      }
    };
    manager.activeChatSubID = () {
      try {
        final path = ref.read(routerProvider).state.uri.path;
        return chatSubIDFromPath(path);
      } catch (_) {
        return null;
      }
    };
    manager.activeChatContentView = () {
      try {
        return ref.read(activeChatProvider.select((s) => s.contentView));
      } catch (_) {
        return null;
      }
    };
    manager.localUserUUID = () {
      try {
        return ref.read(userStoreProvider).localUserUUID;
      } catch (_) {
        return null;
      }
    };
    manager.getChat = (uuid) {
      try {
        final chats = ref.read(chatListProvider).chats;
        ChatModel? chat;
        for (final c in chats) {
          if (c.uuid == uuid) {
            chat = c;
            break;
          }
        }
        if (chat == null) return null;
        return {
          'uuid': chat.uuid,
          'name': chat.name,
          'type': chat.type,
          'profilePictureUUID': chat.profilePictureUUID,
          'members': chat.members,
        };
      } catch (_) {
        return null;
      }
    };
    manager.getUser = (uuid) {
      try {
        final user = ref.read(userStoreProvider.notifier).getUser(uuid);
        if (user == null) return null;
        return user.toMap();
      } catch (_) {
        return null;
      }
    };
    manager.isChatMuted = (chatUUID) {
      try {
        final chats = ref.read(chatListProvider).chats;
        ChatModel? chat;
        for (final c in chats) {
          if (c.uuid == chatUUID) {
            chat = c;
            break;
          }
        }
        if (chat == null) return false;
        final local = ref.read(userStoreProvider).localUserUUID;
        for (final m in chat.members) {
          final uuid = (m['uuid'] ?? m['userUUID'])?.toString();
          if (uuid == local) {
            return m['is_muted'] == true || m['isMuted'] == true;
          }
        }
        return false;
      } catch (_) {
        return false;
      }
    };
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    NotificationManager.instance.setLifecycle(state);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _wireManager();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    NotificationBridge.unregister();
    CommsNotificationService.instance.clearHandlers();
    if (_onMessageNew != null) {
      GlobalEventEmitter.instance.off('message:new', _onMessageNew!);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(activeChatProvider.select((s) => s.selectedChatUUID), (
      prev,
      next,
    ) {
      if (next != null && next.isNotEmpty) {
        unawaited(NotificationManager.instance.clearChat(next));
      }
    });
    ref.listen<CommsState>(commsProvider, (prev, next) {
      ref.read(commsProvider.notifier).syncCommsNotification();
    });
    ref.listen<bool>(authProvider, (prev, next) {
      if (next && prev != true) {
        unawaited(_requestPermissionsOnce());
      }
    });
    _wireManager();
    return widget.child;
  }
}
