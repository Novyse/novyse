part of '../comms_controller.dart';

/// Pin / fullscreen / error helpers.
mixin CommsViewStateMixin on Notifier<CommsState> {
  void _notifyStateChange() {
    state = state.copyWith();
  }

  /// Pin a specific stream tile (or unpin if already pinned).
  void togglePin(String streamId) {
    state = state.copyWith(
      pinnedStreamId: () => state.pinnedStreamId == streamId ? null : streamId,
    );
  }

  /// Enter or exit fullscreen for a specific stream tile.
  void toggleFullscreen(String streamId) {
    state = state.copyWith(
      fullscreenStreamId: () =>
          state.fullscreenStreamId == streamId ? null : streamId,
    );
  }

  /// Explicitly exit fullscreen (e.g. ESC pressed, tile gone, dispose).
  void exitFullscreen() {
    if (state.fullscreenStreamId == null) return;
    state = state.copyWith(fullscreenStreamId: () => null);
  }

  void clearError() {
    state = state.copyWith(
      errorMessage: () => null,
      errorMessageBuilder: () => null,
    );
  }
}
