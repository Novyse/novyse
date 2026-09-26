import 'dart:async' show Timer;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/message_store.dart';

/// Highlight / jump-to-message scrolling for the message list.
mixin MessageListScroller<T extends ConsumerStatefulWidget>
    on ConsumerState<T> {
  String get chatUUID;
  int get subID;
  dynamic get highlightedMessageId;
  Map<String, GlobalKey> get itemKeys;
  ScrollController get effectiveController;

  int _scrollAttempts = 0;

  dynamic _jumpHighlightedMessageId;
  int? _jumpRangeStart;
  int? _jumpRangeEnd;
  Timer? _jumpHighlightTimer;

  @override
  void dispose() {
    _jumpHighlightTimer?.cancel();
    super.dispose();
  }

  /// Fetches a message if needed, scrolls to it with a temporary highlight
  /// and clears the one-shot scroll target.
  Future<void> handleScrollTarget(
    String id, {
    int? rangeStart,
    int? rangeEnd,
  }) async {
    final notifier = ref.read(
      chatMessagesProvider((chatUUID: chatUUID, subID: subID)).notifier,
    );
    await notifier.fetchMessageById(id);
    if (mounted) {
      _jumpToMessage(id, rangeStart: rangeStart, rangeEnd: rangeEnd);
      ref.read(activeChatProvider.notifier).clearScrollTarget();
    }
  }

  void _jumpToMessage(dynamic messageId, {int? rangeStart, int? rangeEnd}) {
    _jumpHighlightTimer?.cancel();
    setState(() {
      _jumpHighlightedMessageId = messageId;
      _jumpRangeStart = rangeStart;
      _jumpRangeEnd = rangeEnd;
    });

    _scrollAttempts = 0;
    _attemptScrollTo(messageId.toString());

    _jumpHighlightTimer = Timer(const Duration(milliseconds: 2000), () {
      if (mounted) {
        setState(() {
          _jumpHighlightedMessageId = null;
          _jumpRangeStart = null;
          _jumpRangeEnd = null;
        });
      }
    });
  }

  /// Scrolls to an explicitly highlighted message (search results).
  void scrollToHighlighted() {
    if (highlightedMessageId == null) return;
    _scrollAttempts = 0;
    _attemptScrollTo(highlightedMessageId.toString());
  }

  void _attemptScrollTo(String targetId) {
    if (!mounted) return;
    final key = itemKeys[targetId];
    final itemContext = key?.currentContext;
    if (itemContext != null) {
      if (_scrollAttempts >= 25) return;
      try {
        Scrollable.ensureVisible(
          itemContext,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          alignment: 0.5,
        );
      } catch (_) {
        _scrollAttempts++;
        _scheduleRetry(targetId);
      }
      return;
    }
    _scrollTowardTarget(targetId);
  }

  void _scrollTowardTarget(String id) {
    if (_scrollAttempts >= 25 || !mounted) return;
    _scrollAttempts++;
    final messages = ref
        .read(
          chatMessagesProvider((
            chatUUID: chatUUID,
            subID: subID,
          )),
        )
        .messages;
    final index = messages.indexWhere((m) => m.id.toString() == id);
    if (index < 0 || messages.isEmpty) {
      _scheduleRetry(id);
      return;
    }
    final controller = effectiveController;
    if (!controller.hasClients) {
      _scheduleRetry(id);
      return;
    }
    final max = controller.position.maxScrollExtent;
    if (max <= 0) {
      _scheduleRetry(id);
      return;
    }
    final target = (max * (index / messages.length)).clamp(0.0, max);
    controller
        .animateTo(
          target,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeInOut,
        )
        .then((_) => _scheduleRetry(id))
        .catchError((_) => _scheduleRetry(id));
  }

  void _scheduleRetry(String targetId) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _attemptScrollTo(targetId);
    });
  }

  /// Highlight state read by the item builder. Null when inactive.
  dynamic get jumpHighlightedMessageId => _jumpHighlightedMessageId;
  int? get jumpRangeStart => _jumpRangeStart;
  int? get jumpRangeEnd => _jumpRangeEnd;
}
