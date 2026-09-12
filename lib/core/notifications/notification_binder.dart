import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/notifications/notification_manager.dart';
import 'package:novyse/core/router/router.dart';
import 'package:novyse/core/services/socket_service.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/pages/app/chat_routes.dart';

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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _wireManager();
    _onMessageNew = (data) {
      if (data is! Map) return;
      final message = Map<String, dynamic>.from(data);
      unawaited(
        NotificationManager.instance.handleInboundMessage(message),
      );
    };
    GlobalEventEmitter.instance.on('message:new', _onMessageNew!);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_bootstrap());
    });
  }

  Future<void> _bootstrap() async {
    await NotificationManager.instance.init();
    await NotificationManager.instance.requestPermissions();
    _wireManager();
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
    _wireManager();
    return widget.child;
  }
}
