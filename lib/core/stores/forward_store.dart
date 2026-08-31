import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/stores/message_store.dart';

/// State for the message forwarding workflow.
@immutable
class ForwardState {
  final List<MessageModel> forwardMessages;
  final bool isForwarding;

  const ForwardState({
    this.forwardMessages = const [],
    this.isForwarding = false,
  });

  ForwardState copyWith({
    List<MessageModel>? forwardMessages,
    bool? isForwarding,
  }) {
    return ForwardState(
      forwardMessages: forwardMessages ?? this.forwardMessages,
      isForwarding: isForwarding ?? this.isForwarding,
    );
  }
}

/// Riverpod Notifier managing forwarded messages selection.
class ForwardNotifier extends Notifier<ForwardState> {
  @override
  ForwardState build() {
    return const ForwardState();
  }

  void setForwardMessages(List<MessageModel> messages) {
    state = state.copyWith(
      forwardMessages: messages,
      isForwarding: messages.isNotEmpty,
    );
  }

  void resetForwarding() {
    state = const ForwardState();
  }
}

/// Provider for global [ForwardNotifier].
final forwardProvider = NotifierProvider<ForwardNotifier, ForwardState>(
  ForwardNotifier.new,
);
