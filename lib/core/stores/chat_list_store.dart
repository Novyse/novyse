import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/user_store.dart';

/// Immutable model representing a Chat in the user's chat list.
@immutable
class ChatModel {
  final String uuid;
  final String name;
  final String type; // 'DM' | 'GROUP' | 'CHANNEL'
  final String? profilePictureUUID;
  final String? handle;
  final int unreadCount;
  final List<Map<String, dynamic>> members;
  final List<Map<String, dynamic>> subs;
  final List<Map<String, dynamic>> pinnedMessages;
  final Map<String, dynamic>? lastMessage;
  final int? pinPosition;
  final DateTime? createdAt;

  const ChatModel({
    required this.uuid,
    required this.name,
    this.type = 'DM',
    this.profilePictureUUID,
    this.handle,
    this.unreadCount = 0,
    this.members = const [],
    this.subs = const [],
    this.pinnedMessages = const [],
    this.lastMessage,
    this.pinPosition,
    this.createdAt,
  });

  bool get isPinned => pinPosition != null;

  factory ChatModel.fromMap(Map<String, dynamic> map) {
    List<Map<String, dynamic>> parseList(dynamic val) {
      if (val is List) {
        return val
            .whereType<Map>()
            .map((m) => Map<String, dynamic>.from(m))
            .toList();
      }
      return const [];
    }

    Map<String, dynamic>? resolveLastMessage() {
      if (map['lastMessage'] is Map) {
        return Map<String, dynamic>.from(map['lastMessage'] as Map);
      }
      if (map['messages'] is List && (map['messages'] as List).isNotEmpty) {
        final last = (map['messages'] as List).last;
        if (last is Map) {
          return Map<String, dynamic>.from(last);
        }
      }
      if (map['subs'] is List) {
        Map<String, dynamic>? latestSubMsg;
        DateTime? latestTime;
        for (final s in map['subs'] as List) {
          if (s is Map && s['lastMessage'] is Map) {
            final subMsg = Map<String, dynamic>.from(s['lastMessage'] as Map);
            final timeVal = subMsg['createdAt'] ?? subMsg['created_at'];
            final dt = timeVal != null
                ? DateTime.tryParse(timeVal.toString())
                : null;
            if (latestTime == null || (dt != null && dt.isAfter(latestTime))) {
              latestTime = dt;
              latestSubMsg = subMsg;
            }
          }
        }
        if (latestSubMsg != null) return latestSubMsg;
      }
      return null;
    }

    return ChatModel(
      uuid: (map['uuid'] ?? map['chatUUID'] ?? '') as String,
      name: (map['name'] ?? '') as String,
      type: (map['type'] ?? 'DM') as String,
      profilePictureUUID: map['profilePictureUUID'] as String?,
      handle: map['handle'] as String?,
      unreadCount: (map['unreadCount'] ?? 0) as int,
      members: parseList(map['members']),
      subs: parseList(map['subs']),
      pinnedMessages: parseList(map['pinnedMessages']),
      lastMessage: resolveLastMessage(),
      pinPosition: map['pinPosition'] as int?,
      createdAt: map['createdAt'] != null
          ? DateTime.tryParse(map['createdAt'].toString())
          : null,
    );
  }

  ChatModel copyWith({
    String? uuid,
    String? name,
    String? type,
    String? profilePictureUUID,
    String? handle,
    int? unreadCount,
    List<Map<String, dynamic>>? members,
    List<Map<String, dynamic>>? subs,
    List<Map<String, dynamic>>? pinnedMessages,
    Map<String, dynamic>? lastMessage,
    int? pinPosition,
    DateTime? createdAt,
  }) {
    return ChatModel(
      uuid: uuid ?? this.uuid,
      name: name ?? this.name,
      type: type ?? this.type,
      profilePictureUUID: profilePictureUUID ?? this.profilePictureUUID,
      handle: handle ?? this.handle,
      unreadCount: unreadCount ?? this.unreadCount,
      members: members ?? this.members,
      subs: subs ?? this.subs,
      pinnedMessages: pinnedMessages ?? this.pinnedMessages,
      lastMessage: lastMessage ?? this.lastMessage,
      pinPosition: pinPosition ?? this.pinPosition,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

/// State for the chat list store.
@immutable
class ChatListState {
  final List<ChatModel> chats;
  final List<Map<String, dynamic>> pinnedChats;
  final bool loading;

  const ChatListState({
    this.chats = const [],
    this.pinnedChats = const [],
    this.loading = false,
  });

  ChatListState copyWith({
    List<ChatModel>? chats,
    List<Map<String, dynamic>>? pinnedChats,
    bool? loading,
  }) {
    return ChatListState(
      chats: chats ?? this.chats,
      pinnedChats: pinnedChats ?? this.pinnedChats,
      loading: loading ?? this.loading,
    );
  }
}

/// Riverpod Notifier managing chat list metadata, unread counts, and realtime updates.
class ChatListNotifier extends Notifier<ChatListState> {
  final List<StreamSubscription> _subscriptions = [];

  @override
  ChatListState build() {
    ref.onDispose(() {
      for (final sub in _subscriptions) {
        sub.cancel();
      }
      _subscriptions.clear();
    });

    _setupEventListeners();
    return const ChatListState();
  }

  void _setupEventListeners() {
    final bus = ref.read(eventBusProvider);

    _subscriptions.add(
      bus.on<ChatNewEvent>().listen((event) {
        onNewChat(event.chat);
      }),
    );

    _subscriptions.add(
      bus.on<ChatUpdateEvent>().listen((event) {
        onChatUpdate(event.chatUUID, event.action, event.data);
      }),
    );

    _subscriptions.add(
      bus.on<ChatMemberJoinedEvent>().listen((event) {
        onMemberJoined(event.chatUUID, event.user);
      }),
    );

    _subscriptions.add(
      bus.on<ChatMemberLeftEvent>().listen((event) {
        onMemberLeft(event.chatUUID, event.user);
      }),
    );

    _subscriptions.add(
      bus.on<ChatMemberActivityEvent>().listen((event) {
        onMemberActivity(event.chatUUID, event.userUUID, event.action);
      }),
    );

    _subscriptions.add(
      bus.on<MessageNewEvent>().listen((event) {
        onNewMessage(event.message);
      }),
    );

    _subscriptions.add(
      bus.on<UserSettingChatUpdateEvent>().listen((event) {
        onUserChatSettingUpdate(event.chatUUID, event.action, event.data);
      }),
    );
  }

  /// Initializes the chat list by loading all chats from SQLite.
  Future<void> init() async {
    state = state.copyWith(loading: true);

    try {
      final db = AppDatabase.instance;
      if (!db.isOpen) {
        await db.initialize();
      }
      final localUserUUID = ref.read(userStoreProvider).localUserUUID;
      final rawChats = await db.chat.get.all(localUserUUID);

      final chats = rawChats.map((raw) => ChatModel.fromMap(raw)).toList();
      _sortChats(chats);

      state = state.copyWith(chats: chats, loading: false);
    } catch (e) {
      debugPrint('ChatListStore init error: $e');
      state = state.copyWith(loading: false);
    }
  }

  void onNewChat(Map<String, dynamic> rawChat) {
    final newChat = ChatModel.fromMap(rawChat);
    final exists = state.chats.any((c) => c.uuid == newChat.uuid);

    List<ChatModel> updated;
    if (exists) {
      updated = state.chats
          .map((c) => c.uuid == newChat.uuid ? newChat : c)
          .toList();
    } else {
      updated = [newChat, ...state.chats];
    }

    _sortChats(updated);
    state = state.copyWith(chats: updated);
  }

  void onChatUpdate(String chatUUID, String action, Map<String, dynamic> data) {
    final updated = state.chats.map((chat) {
      if (chat.uuid != chatUUID) return chat;

      switch (action) {
        case 'rename':
          if (chat.type == 'DM') return chat;
          return chat.copyWith(name: data['name'] as String? ?? chat.name);

        case 'picture':
          if (chat.type == 'DM') return chat;
          return chat.copyWith(
            profilePictureUUID: data['profilePictureUUID'] as String?,
          );

        case 'sub_create':
          final newSub = data['sub'] is Map
              ? Map<String, dynamic>.from(data['sub'] as Map)
              : Map<String, dynamic>.from(data);
          final subs = List<Map<String, dynamic>>.from(chat.subs);
          if (!subs.any((s) => s['id'] == newSub['id'])) {
            subs.add(newSub);
          }
          return chat.copyWith(subs: subs);

        case 'sub_rename':
          final targetSub = data['sub'] is Map
              ? Map<String, dynamic>.from(data['sub'] as Map)
              : Map<String, dynamic>.from(data);
          final subs = chat.subs.map((s) {
            if (s['id'] == targetSub['id']) {
              return {...s, 'name': targetSub['name']};
            }
            return s;
          }).toList();
          return chat.copyWith(subs: subs);

        case 'sub_delete':
          final subID = data['subID'] ?? data['id'];
          final subs = chat.subs.where((s) => s['id'] != subID).toList();
          return chat.copyWith(subs: subs);

        default:
          return chat;
      }
    }).toList();

    state = state.copyWith(chats: updated);
  }

  void onMemberJoined(String chatUUID, Map<String, dynamic> rawUser) {
    final updated = state.chats.map((chat) {
      if (chat.uuid != chatUUID) return chat;
      final userUUID = rawUser['uuid'] ?? rawUser['userUUID'];
      final members = List<Map<String, dynamic>>.from(chat.members);
      if (!members.any((m) => (m['uuid'] ?? m['userUUID']) == userUUID)) {
        members.add(rawUser);
      }
      return chat.copyWith(members: members);
    }).toList();

    state = state.copyWith(chats: updated);
  }

  void onMemberLeft(String chatUUID, Map<String, dynamic> rawUser) {
    final updated = state.chats.map((chat) {
      if (chat.uuid != chatUUID) return chat;
      final userUUID = rawUser['uuid'] ?? rawUser['userUUID'];
      final members = chat.members
          .where((m) => (m['uuid'] ?? m['userUUID']) != userUUID)
          .toList();
      return chat.copyWith(members: members);
    }).toList();

    state = state.copyWith(chats: updated);
  }

  void onMemberActivity(String chatUUID, String userUUID, String action) {
    final updated = state.chats.map((chat) {
      if (chat.uuid != chatUUID) return chat;
      final members = chat.members.map((member) {
        if ((member['uuid'] ?? member['userUUID']) == userUUID) {
          return {...member, 'action': action};
        }
        return member;
      }).toList();
      return chat.copyWith(members: members);
    }).toList();

    state = state.copyWith(chats: updated);
  }

  void onNewMessage(Map<String, dynamic> message) {
    final chatUUID = (message['chatUUID'] ?? '').toString();
    if (chatUUID.isEmpty) return;

    final localUserUUID = ref.read(userStoreProvider).localUserUUID;
    final senderUUID = (message['userUUID'] ?? message['senderUUID'])
        ?.toString();
    final isFromMe =
        senderUUID != null &&
        senderUUID.isNotEmpty &&
        senderUUID == localUserUUID;

    final updated = state.chats.map((chat) {
      if (chat.uuid != chatUUID) return chat;
      return chat.copyWith(
        lastMessage: message,
        unreadCount: isFromMe ? chat.unreadCount : chat.unreadCount + 1,
      );
    }).toList();

    _sortChats(updated);
    state = state.copyWith(chats: updated);
  }

  void markAsRead(String chatUUID) {
    final updated = state.chats.map((chat) {
      if (chat.uuid != chatUUID) return chat;
      return chat.copyWith(unreadCount: 0);
    }).toList();

    state = state.copyWith(chats: updated);
  }

  void onUserChatSettingUpdate(
    String chatUUID,
    String action,
    Map<String, dynamic> data,
  ) {
    if (action == 'pin_add') {
      final position = (data['position'] ?? 0) as int;
      final updated = state.chats.map((chat) {
        if (chat.uuid == chatUUID) {
          return chat.copyWith(pinPosition: position);
        }
        return chat;
      }).toList();

      _sortChats(updated);
      state = state.copyWith(chats: updated);
    } else if (action == 'pin_remove') {
      final updated = state.chats.map((chat) {
        if (chat.uuid == chatUUID) {
          return ChatModel(
            uuid: chat.uuid,
            name: chat.name,
            type: chat.type,
            profilePictureUUID: chat.profilePictureUUID,
            handle: chat.handle,
            unreadCount: chat.unreadCount,
            members: chat.members,
            subs: chat.subs,
            pinnedMessages: chat.pinnedMessages,
            lastMessage: chat.lastMessage,
            pinPosition: null,
            createdAt: chat.createdAt,
          );
        }
        return chat;
      }).toList();

      _sortChats(updated);
      state = state.copyWith(chats: updated);
    }
  }

  void _sortChats(List<ChatModel> list) {
    list.sort((a, b) {
      // Pinned chats first, sorted by pinPosition ascending
      if (a.isPinned && b.isPinned) {
        return (a.pinPosition ?? 0).compareTo(b.pinPosition ?? 0);
      }
      if (a.isPinned) return -1;
      if (b.isPinned) return 1;

      // Otherwise sort by last message timestamp descending
      final aTime = _getMessageTime(a.lastMessage);
      final bTime = _getMessageTime(b.lastMessage);
      return bTime.compareTo(aTime);
    });
  }

  DateTime _getMessageTime(Map<String, dynamic>? msg) {
    if (msg == null) return DateTime.fromMillisecondsSinceEpoch(0);
    final val = msg['createdAt'] ?? msg['created_at'];
    if (val != null) {
      final parsed = DateTime.tryParse(val.toString());
      if (parsed != null) return parsed;
    }
    return DateTime.fromMillisecondsSinceEpoch(0);
  }

  void clear() {
    state = const ChatListState();
  }
}

/// Provider for global [ChatListNotifier].
final chatListProvider = NotifierProvider<ChatListNotifier, ChatListState>(
  ChatListNotifier.new,
);

/// Granular Family Provider returning a single [ChatModel] by UUID.
/// Any widget watching `chatProvider(uuid)` will ONLY rebuild when THAT chat changes.
final chatProvider = Provider.family<ChatModel?, String>((ref, chatUUID) {
  final chats = ref.watch(chatListProvider.select((s) => s.chats));
  for (final chat in chats) {
    if (chat.uuid == chatUUID) return chat;
  }
  return null;
});
