import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/appicon/app_icon_catalog.dart';

/// Local draft for the launcher icon editor
/// (Customization > App Icon > launcher editor).
///
/// A `null` [AppIconDraftState.iconId] means "untouched" and follows the
/// persisted settings (the baseline), so late store loads still fill the
/// editor. Anything non-null is a user edit. Nothing is persisted or
/// applied until [save] runs — mirroring the Edit Profile flow (tick to
/// save, undo to discard).
@immutable
class AppIconDraftState {
  final String? iconId;
  final bool saving;

  /// Bumped on [discard] so the editor rebuilds from the baseline.
  final int revision;

  const AppIconDraftState({this.iconId, this.saving = false, this.revision = 0});

  AppIconDraftState copyWith({String? iconId, bool? saving, int? revision}) {
    return AppIconDraftState(
      iconId: iconId ?? this.iconId,
      saving: saving ?? this.saving,
      revision: revision ?? this.revision,
    );
  }
}

/// Edits the local app-icon draft and applies it on save.
class AppIconDraftNotifier extends Notifier<AppIconDraftState> {
  bool _disposed = false;

  @override
  AppIconDraftState build() {
    ref.onDispose(() => _disposed = true);
    return const AppIconDraftState();
  }

  void setIconId(String value) => state = state.copyWith(iconId: value);

  String effectiveIconId(Map<String, Object?> baseline) =>
      state.iconId ??
      (baseline[AppIconCatalog.iconKey] as String? ??
          AppIconCatalog.defaultIconId);

  /// Whether the draft differs from the persisted [baseline].
  bool isDirty(Map<String, Object?> baseline) {
    return effectiveIconId(baseline) !=
        (baseline[AppIconCatalog.iconKey] as String? ??
            AppIconCatalog.defaultIconId);
  }

  /// Drops every edit and restores the baseline values.
  void discard() {
    if (state.saving) return;
    state = const AppIconDraftState().copyWith(revision: state.revision + 1);
  }

  /// Resolves the native alias, applies it, then persists the preference
  /// key. Returns true on success, false when the native call or the
  /// persistence fails (the draft is kept so the user can retry).
  Future<bool> save({
    required Map<String, Object?> baseline,
    required Future<void> Function(String? alias) apply,
    required Future<bool> Function(String key, Object? value) persist,
  }) async {
    if (state.saving) return false;
    if (!isDirty(baseline)) return true;

    final iconId = effectiveIconId(baseline);
    final alias = AppIconCatalog.resolveAlias(iconId: iconId);

    state = state.copyWith(saving: true);
    try {
      await apply(alias);
      final ok = await persist(AppIconCatalog.iconKey, iconId);
      if (!ok) {
        if (!_disposed) state = state.copyWith(saving: false);
        return false;
      }
    } catch (e) {
      debugPrint('[AppIconDraft] save failed: $e');
      if (!_disposed) state = state.copyWith(saving: false);
      return false;
    }
    if (_disposed) return false;
    // Kept as an explicit value (it now matches the new baseline), so the
    // editor shows exactly what was saved without rebuilding.
    state = state.copyWith(saving: false);
    return true;
  }
}

/// Provider for the draft edited in Customization > App Icon.
final appIconDraftProvider =
    NotifierProvider<AppIconDraftNotifier, AppIconDraftState>(
      AppIconDraftNotifier.new,
    );
