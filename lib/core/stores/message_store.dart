import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/storage/database/database.dart';

/// Immutable model representing a Chat message.
@immutable
class MessageModel {
  final dynamic id;
  final String? uuid;
  final String chatUUID;
  final int subID;
  final String userUUID;
  final DateTime createdAt;
  final bool edited;
  final bool pinned;
  final String? content;
  final List<dynamic> replyTos;
  final List<Map<String, dynamic>> reactions;
  final List<dynamic> reads;
  final List<Map<String, dynamic>> files;
  final dynamic format;

  const MessageModel({
    required this.id,
    this.uuid,
    required this.chatUUID,
    this.subID = 0,
    required this.userUUID,
    required this.createdAt,
    this.edited = false,
    this.pinned = false,
    this.content,
    this.replyTos = const [],
    this.reactions = const [],
    this.reads = const [],
    this.files = const [],
    this.format,
  });

  factory MessageModel.fromMap(Map<String, dynamic> map) {
    DateTime parseCreatedAt(dynamic val) {
      if (val is DateTime) return val;
      if (val is String && val.isNotEmpty) {
        return DateTime.tryParse(val) ?? DateTime.now();
      }
      return DateTime.now();
    }

    List<Map<String, dynamic>> parseMapList(dynamic val) {
      if (val is List) {
        return val
            .whereType<Map>()
            .map((m) => Map<String, dynamic>.from(m))
            .toList();
      }
      return const [];
    }

    return MessageModel(
      id: map['id'] ?? map['messageID'] ?? 0,
      uuid: map['uuid'] as String?,
      chatUUID: (map['chatUUID'] ?? '').toString(),
      subID: map['subID'] is num
          ? (map['subID'] as num).toInt()
          : (int.tryParse(map['subID']?.toString() ?? '0') ?? 0),
      userUUID:
          (map['userUUID'] ?? map['senderUUID'] ?? map['sender_uuid'] ?? '')
              .toString(),
      createdAt: parseCreatedAt(
        map['createdAt'] ?? map['created_at'] ?? map['time'] ?? map['at'],
      ),
      edited: map['edited'] == true || map['edited'] == 1,
      pinned: map['pinned'] == true || map['pinned'] == 1,
      content: (map['content'] ?? map['text'])?.toString(),
      replyTos: map['replyTos'] is List ? (map['replyTos'] as List) : const [],
      reactions: parseMapList(map['reactions']),
      reads: map['reads'] is List ? (map['reads'] as List) : const [],
      files: parseMapList(map['files']),
      format: map['format'],
    );
  }

  MessageModel copyWith({
    dynamic id,
    String? uuid,
    String? chatUUID,
    int? subID,
    String? userUUID,
    DateTime? createdAt,
    bool? edited,
    bool? pinned,
    String? content,
    List<dynamic>? replyTos,
    List<Map<String, dynamic>>? reactions,
    List<dynamic>? reads,
    List<Map<String, dynamic>>? files,
    dynamic format,
  }) {
    return MessageModel(
      id: id ?? this.id,
      uuid: uuid ?? this.uuid,
      chatUUID: chatUUID ?? this.chatUUID,
      subID: subID ?? this.subID,
      userUUID: userUUID ?? this.userUUID,
      createdAt: createdAt ?? this.createdAt,
      edited: edited ?? this.edited,
      pinned: pinned ?? this.pinned,
      content: content ?? this.content,
      replyTos: replyTos ?? this.replyTos,
      reactions: reactions ?? this.reactions,
      reads: reads ?? this.reads,
      files: files ?? this.files,
      format: format ?? this.format,
    );
  }
}

/// State for the paginated message list of a specific chat & sub-channel.
@immutable
class MessageListState {
  final List<MessageModel> messages;
  final bool loading;
  final bool hasMore;
  final bool historyLoaded;

  const MessageListState({
    this.messages = const [],
    this.loading = false,
    this.hasMore = true,
    this.historyLoaded = false,
  });

  MessageListState copyWith({
    List<MessageModel>? messages,
    bool? loading,
    bool? hasMore,
    bool? historyLoaded,
  }) {
    return MessageListState(
      messages: messages ?? this.messages,
      loading: loading ?? this.loading,
      hasMore: hasMore ?? this.hasMore,
      historyLoaded: historyLoaded ?? this.historyLoaded,
    );
  }
}

/// Family Notifier holding the cached, paginated messages for a (chatUUID, subID) pair.
class MessageListNotifier
    extends FamilyNotifier<MessageListState, ({String chatUUID, int subID})> {
  final List<StreamSubscription> _subscriptions = [];
  bool _isInitInProgress = false;

  @override
  MessageListState build(({String chatUUID, int subID}) arg) {
    ref.onDispose(() {
      for (final sub in _subscriptions) {
        sub.cancel();
      }
      _subscriptions.clear();
    });

    _setupEventListeners();
    return const MessageListState();
  }

  void _setupEventListeners() {
    final bus = ref.read(eventBusProvider);

    _subscriptions.add(
      bus.on<MessageNewEvent>().listen((event) {
        final msg = event.message;
        if (msg['chatUUID'] == arg.chatUUID &&
            (msg['subID'] ?? 0) == arg.subID) {
          onNewMessage(msg);
        }
      }),
    );

    _subscriptions.add(
      bus.on<MessageUpdateEvent>().listen((event) {
        if (event.chatUUID == arg.chatUUID && event.subID == arg.subID) {
          onMessageUpdate(event.messageID, event.action, event.data);
        }
      }),
    );
  }

  /// Initial load of messages for this channel from SQLite.
  Future<void> init({AppDatabase? dbOverride, int limit = 50}) async {
    if (_isInitInProgress || state.historyLoaded) return;
    _isInitInProgress = true;
    state = state.copyWith(loading: true);

    try {
      final AppDatabase db = dbOverride ?? ref.read(databaseProvider);
      if (!db.isOpen) {
        await db.initialize();
      }
      final rawMessages = await db.message.get.by.sub(
        arg.chatUUID,
        arg.subID,
        limit: limit,
      );

      final list = rawMessages.reversed
          .map((raw) => MessageModel.fromMap(raw))
          .toList();

      state = state.copyWith(
        messages: list,
        loading: false,
        hasMore: rawMessages.length >= limit,
        historyLoaded: true,
      );
    } catch (e) {
      debugPrint('MessageStore init error for ${arg.chatUUID}: $e');
      state = state.copyWith(loading: false);
    } finally {
      _isInitInProgress = false;
    }
  }

  /// Loads older messages before the oldest current message.
  Future<void> loadMore({AppDatabase? dbOverride, int limit = 50}) async {
    if (state.loading || !state.hasMore || state.messages.isEmpty) return;

    state = state.copyWith(loading: true);

    try {
      final oldestTime = state.messages.last.createdAt.toIso8601String();
      final AppDatabase db = dbOverride ?? ref.read(databaseProvider);
      final rawOlder = await db.message.get.by.sub(
        arg.chatUUID,
        arg.subID,
        limit: limit,
        beforeTime: oldestTime,
      );

      final older = rawOlder.map((raw) => MessageModel.fromMap(raw)).toList();

      state = state.copyWith(
        messages: [...state.messages, ...older],
        loading: false,
        hasMore: older.length >= limit,
      );
    } catch (e) {
      debugPrint('MessageStore loadMore error: $e');
      state = state.copyWith(loading: false);
    }
  }

  void onNewMessage(Map<String, dynamic> raw) {
    final newMsg = MessageModel.fromMap(raw);
    final exists = state.messages.any(
      (m) => m.id.toString() == newMsg.id.toString(),
    );

    if (exists) {
      state = state.copyWith(
        messages: state.messages.map((m) {
          return m.id.toString() == newMsg.id.toString() ? newMsg : m;
        }).toList(),
      );
    } else {
      state = state.copyWith(messages: [newMsg, ...state.messages]);
    }
  }

  void onMessageUpdate(
    String messageID,
    String action,
    Map<String, dynamic> data,
  ) {
    switch (action) {
      case 'delete':
        state = state.copyWith(
          messages: state.messages
              .where((m) => m.id.toString() != messageID)
              .toList(),
        );
        break;

      case 'edit':
        state = state.copyWith(
          messages: state.messages.map((m) {
            if (m.id.toString() == messageID) {
              final newContent = (data['content'] ?? data['text']) as String?;
              return m.copyWith(content: newContent, edited: true);
            }
            return m;
          }).toList(),
        );
        break;

      case 'pin_add':
        state = state.copyWith(
          messages: state.messages.map((m) {
            if (m.id.toString() == messageID) {
              return m.copyWith(pinned: true);
            }
            return m;
          }).toList(),
        );
        break;

      case 'pin_remove':
        state = state.copyWith(
          messages: state.messages.map((m) {
            if (m.id.toString() == messageID) {
              return m.copyWith(pinned: false);
            }
            return m;
          }).toList(),
        );
        break;

      case 'reaction_add':
        state = state.copyWith(
          messages: state.messages.map((m) {
            if (m.id.toString() != messageID) return m;

            final emoji = data['reaction'] as String?;
            final userUUID = data['userUUID'] as String?;
            if (emoji == null || userUUID == null) return m;

            final reactions = List<Map<String, dynamic>>.from(m.reactions);
            final idx = reactions.indexWhere((r) => r['emoji'] == emoji);

            if (idx >= 0) {
              final users = List<String>.from(
                reactions[idx]['userUUIDs'] ?? [],
              );
              if (!users.contains(userUUID)) {
                users.add(userUUID);
                reactions[idx] = {
                  ...reactions[idx],
                  'userUUIDs': users,
                  'at': data['at'] ?? DateTime.now().toIso8601String(),
                };
              }
            } else {
              reactions.add({
                'emoji': emoji,
                'userUUIDs': [userUUID],
                'at': data['at'] ?? DateTime.now().toIso8601String(),
              });
            }

            return m.copyWith(reactions: reactions);
          }).toList(),
        );
        break;

      case 'reaction_remove':
        state = state.copyWith(
          messages: state.messages.map((m) {
            if (m.id.toString() != messageID) return m;

            final emoji = data['reaction'] as String?;
            final userUUID = data['userUUID'] as String?;
            if (emoji == null || userUUID == null) return m;

            final reactions = List<Map<String, dynamic>>.from(m.reactions);
            final idx = reactions.indexWhere((r) => r['emoji'] == emoji);
            if (idx < 0) return m;

            final users = List<String>.from(reactions[idx]['userUUIDs'] ?? [])
                .where((u) => u != userUUID)
                .toList();

            if (users.isEmpty) {
              reactions.removeAt(idx);
            } else {
              reactions[idx] = {...reactions[idx], 'userUUIDs': users};
            }

            return m.copyWith(reactions: reactions);
          }).toList(),
        );
        break;
    }
  }

  void clear() {
    state = const MessageListState();
  }
}

/// Family provider that returns paginated messages for a specific (chatUUID, subID).
final chatMessagesProvider =
    NotifierProvider.family<
      MessageListNotifier,
      MessageListState,
      ({String chatUUID, int subID})
    >(MessageListNotifier.new);
