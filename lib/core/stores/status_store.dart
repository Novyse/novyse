import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/status/status_message.dart'
    show StatusMessageType;

/// Signature for localized string resolver callbacks.
typedef LocalizedStringBuilder = String Function(AppLocalizations l10n);

/// Sources that can emit status messages.
enum StatusSource {
  network(100),
  initSync(80),
  socket(60),
  apiGateway(40),
  general(20);

  final int defaultPriority;
  const StatusSource(this.defaultPriority);
}

/// Model representing a single status notification item.
@immutable
class StatusItem {
  final String id;
  final StatusSource source;
  final StatusMessageType type;
  final String? title;
  final LocalizedStringBuilder? titleBuilder;
  final List<String> content;
  final List<LocalizedStringBuilder>? contentBuilders;
  final double? progress; // 0.0 to 1.0, or null for no progress bar
  final Duration? timeout;
  final bool closable;
  final String? actionLabel;
  final LocalizedStringBuilder? actionLabelBuilder;
  final VoidCallback? onAction;
  final int priority;
  final DateTime createdAt;

  StatusItem({
    required this.id,
    required this.source,
    required this.type,
    this.title,
    this.titleBuilder,
    this.content = const [],
    this.contentBuilders,
    this.progress,
    this.timeout,
    this.closable = true,
    this.actionLabel,
    this.actionLabelBuilder,
    this.onAction,
    int? priority,
    DateTime? createdAt,
  })  : priority = priority ?? source.defaultPriority,
        createdAt = createdAt ?? DateTime.now();

  StatusItem copyWith({
    String? id,
    StatusSource? source,
    StatusMessageType? type,
    String? title,
    LocalizedStringBuilder? titleBuilder,
    List<String>? content,
    List<LocalizedStringBuilder>? contentBuilders,
    double? Function()? progress,
    Duration? timeout,
    bool? closable,
    String? actionLabel,
    LocalizedStringBuilder? actionLabelBuilder,
    VoidCallback? onAction,
    int? priority,
    DateTime? createdAt,
  }) {
    return StatusItem(
      id: id ?? this.id,
      source: source ?? this.source,
      type: type ?? this.type,
      title: title ?? this.title,
      titleBuilder: titleBuilder ?? this.titleBuilder,
      content: content ?? this.content,
      contentBuilders: contentBuilders ?? this.contentBuilders,
      progress: progress != null ? progress() : this.progress,
      timeout: timeout ?? this.timeout,
      closable: closable ?? this.closable,
      actionLabel: actionLabel ?? this.actionLabel,
      actionLabelBuilder: actionLabelBuilder ?? this.actionLabelBuilder,
      onAction: onAction ?? this.onAction,
      priority: priority ?? this.priority,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

/// State containing all active status messages and computing the primary one.
@immutable
class StatusState {
  final Map<String, StatusItem> activeStatuses;

  const StatusState({this.activeStatuses = const {}});

  /// Returns the highest priority active status item, or null if none.
  StatusItem? get primaryStatus {
    if (activeStatuses.isEmpty) return null;

    final sorted = activeStatuses.values.toList()
      ..sort((a, b) {
        final cmp = b.priority.compareTo(a.priority);
        if (cmp != 0) return cmp;
        return b.createdAt.compareTo(a.createdAt);
      });

    return sorted.first;
  }

  StatusState copyWith({Map<String, StatusItem>? activeStatuses}) {
    return StatusState(
      activeStatuses: activeStatuses ?? this.activeStatuses,
    );
  }
}

/// Riverpod Notifier managing the app's global status notifications.
class StatusNotifier extends Notifier<StatusState> {
  final Map<String, Timer> _timeoutTimers = {};

  @override
  StatusState build() {
    ref.onDispose(() {
      for (final timer in _timeoutTimers.values) {
        timer.cancel();
      }
      _timeoutTimers.clear();
    });
    return const StatusState();
  }

  /// Displays or updates a status item.
  void showStatus(StatusItem item) {
    _cancelTimer(item.id);

    final updated = Map<String, StatusItem>.from(state.activeStatuses);
    updated[item.id] = item;
    state = state.copyWith(activeStatuses: updated);

    if (item.timeout != null && item.timeout! > Duration.zero) {
      _timeoutTimers[item.id] = Timer(item.timeout!, () {
        dismissStatus(item.id);
      });
    }
  }

  /// Updates progress or message for an existing status item.
  void updateProgress(
    String id, {
    double? progress,
    String? message,
    LocalizedStringBuilder? messageBuilder,
    String? title,
    LocalizedStringBuilder? titleBuilder,
  }) {
    final existing = state.activeStatuses[id];
    if (existing == null) return;

    final updated = existing.copyWith(
      title: title ?? (titleBuilder != null ? null : existing.title),
      titleBuilder: titleBuilder ?? existing.titleBuilder,
      content: message != null ? [message] : (messageBuilder != null ? const [] : existing.content),
      contentBuilders: messageBuilder != null ? [messageBuilder] : existing.contentBuilders,
      progress: progress != null ? () => progress : null,
    );

    showStatus(updated);
  }

  /// Dismisses a status item by its ID.
  void dismissStatus(String id) {
    _cancelTimer(id);
    if (!state.activeStatuses.containsKey(id)) return;

    final updated = Map<String, StatusItem>.from(state.activeStatuses)
      ..remove(id);
    state = state.copyWith(activeStatuses: updated);
  }

  /// Clears all statuses originating from a specific [StatusSource].
  void clearSource(StatusSource source) {
    final toRemove = state.activeStatuses.values
        .where((item) => item.source == source)
        .map((item) => item.id)
        .toList();

    for (final id in toRemove) {
      _cancelTimer(id);
    }

    final updated = Map<String, StatusItem>.from(state.activeStatuses)
      ..removeWhere((id, item) => item.source == source);
    state = state.copyWith(activeStatuses: updated);
  }

  /// Clears all active status items.
  void clearAll() {
    for (final timer in _timeoutTimers.values) {
      timer.cancel();
    }
    _timeoutTimers.clear();
    state = const StatusState();
  }

  void _cancelTimer(String id) {
    _timeoutTimers[id]?.cancel();
    _timeoutTimers.remove(id);
  }

  // --- Convenience Helper Methods with Localization ---

  /// Sets or clears the offline status notification.
  void setOffline(bool isOffline) {
    const id = 'network_offline';
    if (isOffline) {
      showStatus(
        StatusItem(
          id: id,
          source: StatusSource.network,
          type: StatusMessageType.danger,
          titleBuilder: (l10n) => l10n.networkOfflineTitle,
          contentBuilders: [(l10n) => l10n.networkOfflineMessage],
          closable: false,
        ),
      );
    } else {
      dismissStatus(id);
    }
  }

  /// Sets or clears the Socket.IO connection status notification.
  void setSocketStatus({
    required bool isConnected,
    bool isConnecting = false,
    String? message,
    LocalizedStringBuilder? messageBuilder,
  }) {
    const id = 'socket_status';
    if (isConnected) {
      dismissStatus(id);
    } else if (isConnecting) {
      showStatus(
        StatusItem(
          id: id,
          source: StatusSource.socket,
          type: StatusMessageType.warning,
          titleBuilder: (l10n) => l10n.socketConnectingTitle,
          content: message != null ? [message] : const [],
          contentBuilders: messageBuilder != null
              ? [messageBuilder]
              : (message == null ? [(l10n) => l10n.socketConnectingMessage] : null),
          closable: false,
        ),
      );
    } else {
      showStatus(
        StatusItem(
          id: id,
          source: StatusSource.socket,
          type: StatusMessageType.warning,
          titleBuilder: (l10n) => l10n.socketDisconnectedTitle,
          content: message != null ? [message] : const [],
          contentBuilders: messageBuilder != null
              ? [messageBuilder]
              : (message == null ? [(l10n) => l10n.socketDisconnectedMessage] : null),
          closable: true,
        ),
      );
    }
  }

  static int _apiErrorCounter = 0;

  /// Emits an API Gateway error status notification.
  void setApiError(
    String message, {
    String? title,
    LocalizedStringBuilder? titleBuilder,
    LocalizedStringBuilder? messageBuilder,
    VoidCallback? onRetry,
    String? actionLabel,
    LocalizedStringBuilder? actionLabelBuilder,
    Duration timeout = const Duration(seconds: 5),
  }) {
    final uniqueId = 'api_error_${DateTime.now().microsecondsSinceEpoch}_${++_apiErrorCounter}';
    showStatus(
      StatusItem(
        id: uniqueId,
        source: StatusSource.apiGateway,
        type: StatusMessageType.danger,
        title: title,
        titleBuilder: titleBuilder ?? (title == null ? (l10n) => l10n.apiErrorTitle : null),
        content: messageBuilder == null ? [message] : const [],
        contentBuilders: messageBuilder != null ? [messageBuilder] : null,
        actionLabel: actionLabel,
        actionLabelBuilder: actionLabelBuilder ?? (onRetry != null ? (l10n) => l10n.retry : null),
        onAction: onRetry,
        timeout: timeout,
        closable: true,
      ),
    );
  }

  /// Updates progress for sync / initialization with localization support.
  void setSyncProgress({
    String? title,
    LocalizedStringBuilder? titleBuilder,
    String? message,
    LocalizedStringBuilder? messageBuilder,
    double? progress,
    int? current,
    int? total,
    String id = 'sync_status',
  }) {
    showStatus(
      StatusItem(
        id: id,
        source: StatusSource.initSync,
        type: StatusMessageType.info,
        title: title,
        titleBuilder: titleBuilder ?? (title == null ? (l10n) => l10n.syncProgressTitle : null),
        content: message != null ? [message] : const [],
        contentBuilders: messageBuilder != null ? [messageBuilder] : null,
        progress: progress,
        closable: false,
      ),
    );
  }

  /// Notifies that sync or init completed successfully.
  void setSyncComplete({
    String? title,
    LocalizedStringBuilder? titleBuilder,
    String? message,
    LocalizedStringBuilder? messageBuilder,
    Duration timeout = const Duration(seconds: 2),
    String id = 'sync_status',
  }) {
    showStatus(
      StatusItem(
        id: id,
        source: StatusSource.initSync,
        type: StatusMessageType.success,
        title: title,
        titleBuilder: titleBuilder ?? (title == null ? (l10n) => l10n.syncCompleteTitle : null),
        content: message != null ? [message] : const [],
        contentBuilders: messageBuilder != null
            ? [messageBuilder]
            : (message == null ? [(l10n) => l10n.syncCompleteMessage] : null),
        timeout: timeout,
        closable: true,
      ),
    );
  }

  /// Emits a sync error with optional countdown or retry handler.
  void setSyncError(
    String error, {
    LocalizedStringBuilder? errorBuilder,
    int? retryCountdown,
    VoidCallback? onRetry,
    String id = 'sync_status',
  }) {
    final builders = <LocalizedStringBuilder>[];
    if (errorBuilder != null) {
      builders.add(errorBuilder);
    }

    if (retryCountdown != null && retryCountdown > 0) {
      builders.add((l10n) => l10n.syncRetryCountdown(retryCountdown));
    }

    showStatus(
      StatusItem(
        id: id,
        source: StatusSource.initSync,
        type: StatusMessageType.danger,
        titleBuilder: (l10n) => l10n.syncErrorTitle,
        content: errorBuilder == null ? [error] : const [],
        contentBuilders: builders.isNotEmpty ? builders : null,
        actionLabelBuilder: onRetry != null ? (l10n) => l10n.retry : null,
        onAction: onRetry,
        closable: true,
      ),
    );
  }
}

/// Global provider for the [StatusNotifier].
final statusProvider = NotifierProvider<StatusNotifier, StatusState>(
  StatusNotifier.new,
);

/// Provider exposing only the currently active primary status item.
final activeStatusProvider = Provider<StatusItem?>((ref) {
  return ref.watch(statusProvider).primaryStatus;
});
