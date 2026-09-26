import 'dart:async' show Timer;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/message_read_service.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/storage/database/database.dart';

/// Read-receipt tracking for the message list: unread anchor, divider jump
/// and visibility-based marking. Mixed into the list state; the state itself
/// only provides the abstract getters below.
mixin MessageReadTracker<T extends ConsumerStatefulWidget>
    on ConsumerState<T> {
  String get chatUUID;
  int get subID;
  dynamic get highlightedMessageId;
  Map<String, GlobalKey> get itemKeys;
  ScrollController get effectiveController;

  bool _markInFlight = false;
  int? _firstUnreadId;
  int _lastMarkedId = 0;
  int _unreadAttempts = 0;
  Timer? _visibleMarkTimer;
  bool _anchoring = false;
  final GlobalKey _listKey = GlobalKey();
  final GlobalKey _unreadDividerKey = GlobalKey();

  /// Id of the unread divider anchor, if any. Read by `build` to place the
  /// divider row.
  int? get firstUnreadId => _firstUnreadId;

  /// Key of the list itself, used to measure the viewport.
  GlobalKey get listKey => _listKey;

  /// Key of the unread divider row, for scrolling it into view.
  GlobalKey get unreadDividerKey => _unreadDividerKey;

  /// Resets anchor state when switching chats.
  void resetUnreadAnchor() {
    _firstUnreadId = null;
    _lastMarkedId = 0;
    _unreadAttempts = 0;
    _anchoring = false;
    _visibleMarkTimer?.cancel();
  }

  @override
  void dispose() {
    _visibleMarkTimer?.cancel();
    super.dispose();
  }

  /// setState after awaits (DB / network) can land mid-build; defer then.
  void _safeSetState(VoidCallback fn) {
    if (!mounted) return;
    if (SchedulerBinding.instance.schedulerPhase == SchedulerPhase.idle) {
      setState(fn);
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(fn);
      });
    }
  }

  /// Opens the chat anchored at the first unread message: after history
  /// loads, the unread divider is placed and scrolled into view. Nothing is
  /// marked as read here — receipts follow actual visibility below.
  /// An explicit highlight target (search / jump-to-message) always wins.
  Future<void> anchorToFirstUnread(String chatUUID, int subID) async {
    if (!mounted ||
        this.chatUUID != chatUUID ||
        this.subID != subID) {
      return;
    }
    if (highlightedMessageId != null) return;
    final localUserUUID = ref.read(
      userStoreProvider.select((s) => s.localUserUUID),
    );
    if (localUserUUID.isEmpty) return;
    _anchoring = true;
    final db = AppDatabase.instance;
    if (!db.isOpen) await db.initialize();
    final anchor = await db.message.read.getUnreadAnchor(
      chatUUID,
      subID,
      localUserUUID,
    );
    final firstUnread = anchor.firstUnreadId;
    if (!mounted ||
        this.chatUUID != chatUUID ||
        this.subID != subID) {
      _anchoring = false;
      return;
    }
    _lastMarkedId = anchor.watermark;
    if (firstUnread <= 0) {
      _anchoring = false;
      return;
    }

    // Page in older history (bounded) until the anchor is loaded.
    var guard = 0;
    while (guard++ < 4) {
      final state = ref.read(
        chatMessagesProvider((chatUUID: chatUUID, subID: subID)),
      );
      if (state.messages.any(
        (m) => m.id.toString() == firstUnread.toString(),
      )) {
        break;
      }
      if (!state.hasMore || state.messages.isEmpty) break;
      await ref
          .read(
            chatMessagesProvider((chatUUID: chatUUID, subID: subID)).notifier,
          )
          .loadMore();
    }
    if (!mounted ||
        this.chatUUID != chatUUID ||
        this.subID != subID) {
      _anchoring = false;
      return;
    }
    _safeSetState(() {
      _firstUnreadId = firstUnread;
      _unreadAttempts = 0;
    });
    _jumpToUnreadDivider();
  }

  /// Lands once, instantly, in front of the unread divider — no animation,
  /// no repeated yanks. Bounded retries only until the lazily-built row
  /// exists, then stops forever, even on failure.
  void _jumpToUnreadDivider() {
    if (!mounted || _firstUnreadId == null) {
      _anchoring = false;
      return;
    }
    if (_unreadAttempts >= 5) {
      _anchoring = false;
      return;
    }
    _unreadAttempts++;
    final dividerContext = _unreadDividerKey.currentContext;
    if (dividerContext != null) {
      try {
        Scrollable.ensureVisible(
          dividerContext,
          duration: Duration.zero,
          // Reverse list: 0.0 is the bottom edge, 1.0 the top edge.
          alignment: 1.0,
        );
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          _anchoring = false;
          markVisibleAsRead(chatUUID, subID);
        });
        return;
      } catch (_) {
        // Fall through to the estimated jump below.
      }
    }
    final messages = ref
        .read(
          chatMessagesProvider((
            chatUUID: chatUUID,
            subID: subID,
          )),
        )
        .messages;
    final k = messages.indexWhere(
      (m) => m.id.toString() == _firstUnreadId.toString(),
    );
    final controller = effectiveController;
    if (k < 0 || !controller.hasClients) {
      _scheduleUnreadRetry();
      return;
    }
    final max = controller.position.maxScrollExtent;
    if (max <= 0) {
      _scheduleUnreadRetry();
      return;
    }
    // Builder index of the divider: firstUnread index + 1. Instant jump:
    // any animation here is perceived as the list scrolling by itself.
    final target = (max * ((k + 1) / (messages.length + 1))).clamp(0.0, max);
    controller.jumpTo(target);
    _scheduleUnreadRetry();
  }

  void _scheduleUnreadRetry() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _jumpToUnreadDivider();
    });
  }

  /// Schedules a visibility pass when scrolling settles.
  bool onScrollNotification(ScrollNotification notification) {
    if (notification.depth != 0) return false;
    if (notification is ScrollEndNotification) {
      _visibleMarkTimer?.cancel();
      _visibleMarkTimer = Timer(const Duration(milliseconds: 400), () {
        if (mounted) markVisibleAsRead(chatUUID, subID);
      });
    }
    return false;
  }

  /// Greatest incoming message id currently displayed on screen.
  /// Uses the per-message keys (no new dependencies); partially visible
  /// items count as displayed.
  int _maxVisibleIncomingId(String localUserUUID) {
    final listBox =
        _listKey.currentContext?.findRenderObject() as RenderBox?;
    if (listBox == null || !listBox.attached) return 0;
    final viewHeight = listBox.size.height;
    if (viewHeight <= 0) return 0;
    final messages = ref
        .read(
          chatMessagesProvider((
            chatUUID: chatUUID,
            subID: subID,
          )),
        )
        .messages;
    var maxId = 0;
    for (final m in messages) {
      if (m.userUUID == localUserUUID) continue;
      final id = int.tryParse(m.id.toString()) ?? 0;
      if (id <= _lastMarkedId || id <= maxId) continue;
      try {
        final box =
            itemKeys[m.id.toString()]?.currentContext?.findRenderObject()
                as RenderBox?;
        if (box == null || !box.attached) continue;
        final top = box.localToGlobal(Offset.zero, ancestor: listBox).dy;
        if (top < viewHeight && top + box.size.height > 0) maxId = id;
      } catch (_) {
        continue;
      }
    }
    return maxId;
  }

  /// Whether this list is the currently visible chat view.
  bool _isVisibleChat(String chatUUID, int subID) {
    if (!mounted || this.chatUUID != chatUUID || this.subID != subID) {
      return false;
    }
    // A stacked (non-top) route must never mark anything as read: its widget
    // can still be mounted underneath the active chat page.
    final route = ModalRoute.of(context);
    if (route != null && !route.isCurrent) return false;
    final activeChat = ref.read(activeChatProvider);
    return activeChat.selectedChatUUID == chatUUID &&
        activeChat.selectedSub == subID;
  }

  /// Counts loaded incoming messages in (prevId, targetId]: exactly what the
  /// watermark jump newly covers, for the badge counter. The loaded window
  /// is contiguous from the unread anchor, so nothing in range is missed.
  int _countNewlyMarked(
    String chatUUID,
    int subID,
    String localUserUUID,
    int prevId,
    int targetId,
  ) {
    final messages = ref
        .read(
          chatMessagesProvider((chatUUID: chatUUID, subID: subID)),
        )
        .messages;
    var count = 0;
    for (final m in messages) {
      if (m.userUUID == localUserUUID) continue;
      final id = int.tryParse(m.id.toString()) ?? 0;
      if (id > prevId && id <= targetId) count++;
    }
    return count;
  }

  void dismissUnreadDivider() {
    if (_firstUnreadId == null) return;
    _safeSetState(() => _firstUnreadId = null);
  }

  /// Marks exactly what is on screen: advances the watermark to the greatest
  /// visible incoming message, never to messages the user hasn't seen.
  /// Suppressed while the opening anchor jump is still landing.
  Future<void> markVisibleAsRead(String chatUUID, int subID) async {
    if (_anchoring) return;
    if (!_isVisibleChat(chatUUID, subID)) return;
    if (_markInFlight) return;
    final localUserUUID = ref.read(
      userStoreProvider.select((s) => s.localUserUUID),
    );
    if (localUserUUID.isEmpty) return;
    final maxVisible = _maxVisibleIncomingId(localUserUUID);
    if (maxVisible <= _lastMarkedId) return;
    _markInFlight = true;
    try {
      final ok = await MessageReadService.instance.markUpTo(
        chatUUID: chatUUID,
        subID: subID,
        localUserUUID: localUserUUID,
        messageID: maxVisible,
        isStillActive: () => _isVisibleChat(chatUUID, subID),
      );
      if (ok) {
        final newly = _countNewlyMarked(
          chatUUID,
          subID,
          localUserUUID,
          _lastMarkedId,
          maxVisible,
        );
        _lastMarkedId = maxVisible;
        ref
            .read(chatListProvider.notifier)
            .applyRead(chatUUID, subID, maxVisible, newly);
      }
    } finally {
      _markInFlight = false;
    }
  }
}
