import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/message_store.dart';

/// State for the favorite messages list.
@immutable
class FavoriteMessagesState {
  final List<MessageModel> favorites;
  final bool loading;

  const FavoriteMessagesState({this.favorites = const [], this.loading = false});

  FavoriteMessagesState copyWith({
    List<MessageModel>? favorites,
    bool? loading,
  }) {
    return FavoriteMessagesState(
      favorites: favorites ?? this.favorites,
      loading: loading ?? this.loading,
    );
  }
}

/// Notifier holding favorite messages, optionally filtered by chat.
///
/// - `chatUUID == null` -> all favorites (global view)
/// - `chatUUID != null` -> favorites for that chat (overview view)
class FavoriteMessagesNotifier
    extends FamilyNotifier<FavoriteMessagesState, String?> {
  final List<StreamSubscription> _subscriptions = [];
  bool _loaded = false;

  @override
  FavoriteMessagesState build(String? arg) {
    ref.onDispose(() {
      for (final s in _subscriptions) {
        s.cancel();
      }
      _subscriptions.clear();
    });
    _setupListeners();
    // Lazy load on first watch.
    Future.microtask(() => init());
    return const FavoriteMessagesState(loading: true);
  }

  void _setupListeners() {
    final bus = ref.read(eventBusProvider);
    _subscriptions.add(
      bus.on<FavoriteMessageUpdateEvent>().listen((event) {
        if (arg == null || event.chatUUID == arg) {
          _onFavoriteEvent(event);
        }
      }),
    );
    _subscriptions.add(
      bus.on<MessageUpdateEvent>().listen((event) {
        if (event.action != 'favorite_add' &&
            event.action != 'favorite_remove') {
          return;
        }
        if (arg == null || event.chatUUID == arg) {
          _onMessageFavoriteEvent(event);
        }
      }),
    );
  }

  Future<void> init() async {
    if (_loaded) return;
    _loaded = true;
    state = state.copyWith(loading: true);
    try {
      final db = AppDatabase.instance;
      if (!db.isOpen) await db.initialize();
      final raw = await db.message.favorite.list(chatUUID: arg);
      final models = raw.map(MessageModel.fromMap).toList();
      state = state.copyWith(favorites: models, loading: false);
    } catch (e) {
      debugPrint('FavoriteMessages init error: $e');
      state = state.copyWith(loading: false);
    }
  }

  Future<void> reload() async {
    try {
      final db = AppDatabase.instance;
      if (!db.isOpen) await db.initialize();
      final raw = await db.message.favorite.list(chatUUID: arg);
      state = state.copyWith(
        favorites: raw.map(MessageModel.fromMap).toList(),
      );
    } catch (e) {
      debugPrint('FavoriteMessages reload error: $e');
    }
  }

  void _onFavoriteEvent(FavoriteMessageUpdateEvent event) {
    if (event.action == 'favorite_remove') {
      state = state.copyWith(
        favorites: state.favorites
            .where(
              (m) =>
                  !(m.chatUUID == event.chatUUID &&
                      m.subID == event.subID &&
                      m.id.toString() == event.messageID),
            )
            .toList(),
      );
      return;
    }
    // favorite_add: reload from SQLite.
    unawaited(reload());
  }

  void _onMessageFavoriteEvent(MessageUpdateEvent event) {
    _onFavoriteEvent(
      FavoriteMessageUpdateEvent(
        chatUUID: event.chatUUID,
        subID: event.subID,
        messageID: event.messageID,
        action: event.action,
        data: event.data,
      ),
    );
  }

  /// Optimistic toggle helper used by UI (the authoritative write happens
  /// in [MessageActionMethods.favorite]).
  void applyLocalFavorite(
    String chatUUID,
    int subID,
    String messageID,
    bool favorited,
  ) {
    if (favorited) {
      unawaited(reload());
    } else {
      state = state.copyWith(
        favorites: state.favorites
            .where(
              (m) =>
                  !(m.chatUUID == chatUUID &&
                      m.subID == subID &&
                      m.id.toString() == messageID),
            )
            .toList(),
      );
    }
  }
}

/// Favorites provider.
/// - `favoriteMessagesProvider(null)` -> all favorites (global view)
/// - `favoriteMessagesProvider(chatUUID)` -> favorites for that chat (overview)
final favoriteMessagesProvider =
    NotifierProvider.family<
      FavoriteMessagesNotifier,
      FavoriteMessagesState,
      String?
    >(FavoriteMessagesNotifier.new);
