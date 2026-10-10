part of '../comms_controller.dart';

/// Per-participant volumes, local mute, persistence.
mixin CommsVolumesMixin on Notifier<CommsState> {
  Timer? _volumesPersistDebounce;
  bool _volumesHydrated = false;

  bool get _isDisposed;
  void _hydrateVolumes(Map<String, Object?> settings) {
    if (_isDisposed || _volumesHydrated || state.remoteVolumes.isNotEmpty) {
      return;
    }
    final saved = CommsAudio.parsePersistedVolumes(
      settings[CommsNotifier.volumesSettingsKey],
    );
    if (saved.isEmpty) return;
    _volumesHydrated = true;
    state = state.copyWith(remoteVolumes: saved);
  }

  /// Set linear volume (0.0..[CommsAudio.maxVolume], 100% = unity) for a
  /// remote participant or track. Values above unity boost the audio.
  /// The value is applied immediately to matching LiveKit audio tracks.
  /// When [persist] is true (default) it is also saved to local settings
  /// with a short debounce; pass false for ephemeral keys such as
  /// screen-share track SIDs.
  Future<void> setRemoteVolume(
    String id,
    double volume, {
    bool persist = true,
  }) async {
    final clamped = CommsAudio.clampVolume(volume);
    final updated = Map<String, double>.from(state.remoteVolumes)
      ..[id] = clamped;
    state = state.copyWith(remoteVolumes: updated);
    if (persist) _scheduleVolumesPersist();
    await CommsAudio.applyToRoom(
      room: state.room,
      volKey: id,
      volumes: state.remoteVolumes,
      muted: state.localMuted,
      outputEnabled: state.isAudioOutputEnabled,
    );
  }

  /// Remove the saved volume for [id] (reset to default 1.0).
  Future<void> clearRemoteVolume(String id) async {
    if (!state.remoteVolumes.containsKey(id)) return;
    final updated = Map<String, double>.from(state.remoteVolumes)..remove(id);
    state = state.copyWith(remoteVolumes: updated);
    await _persistVolumesNow();
    await CommsAudio.applyToRoom(
      room: state.room,
      volKey: id,
      volumes: state.remoteVolumes,
      muted: state.localMuted,
      outputEnabled: state.isAudioOutputEnabled,
    );
  }

  /// Remove all saved volumes.
  Future<void> clearAllRemoteVolumes() async {
    if (state.remoteVolumes.isEmpty) return;
    state = state.copyWith(remoteVolumes: {});
    await _persistVolumesNow();
    await CommsAudio.applyAll(
      room: state.room,
      volumes: state.remoteVolumes,
      muted: state.localMuted,
      outputEnabled: state.isAudioOutputEnabled,
    );
  }

  void _scheduleVolumesPersist() {
    if (_isDisposed) return;
    _volumesPersistDebounce?.cancel();
    _volumesPersistDebounce = Timer(CommsNotifier.volumesPersistDebounce, () {
      _volumesPersistDebounce = null;
      unawaited(_persistVolumesNow());
    });
  }

  Future<void> _persistVolumesNow() async {
    _volumesPersistDebounce?.cancel();
    _volumesPersistDebounce = null;
    if (_isDisposed) return;
    var entries = state.remoteVolumes.entries.toList();
    if (entries.length > CommsNotifier.maxPersistedVolumes) {
      entries = entries.sublist(
        entries.length - CommsNotifier.maxPersistedVolumes,
      );
    }
    try {
      await ref
          .read(settingsControllerProvider.notifier)
          .set(
            CommsNotifier.volumesSettingsKey,
            Map<String, double>.fromEntries(entries),
          );
    } catch (e) {
      debugPrint('[CommsController] persist volumes failed: $e');
    }
  }

  /// Toggle local-only mute for a remote participant or track.
  Future<void> toggleLocalMute(String id) async {
    final current = state.localMuted[id] ?? false;
    final updated = Map<String, bool>.from(state.localMuted)..[id] = !current;
    state = state.copyWith(localMuted: updated);
    await CommsAudio.applyToRoom(
      room: state.room,
      volKey: id,
      volumes: state.remoteVolumes,
      muted: state.localMuted,
      outputEnabled: state.isAudioOutputEnabled,
    );
  }
}
