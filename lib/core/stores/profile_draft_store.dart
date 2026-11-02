import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/user_store.dart';

/// Local draft for the editable profile fields (name, surname, biography).
///
/// A `null` field means "untouched" and follows the local user (the baseline),
/// so late store loads still fill the text fields. Anything non-null is a
/// user edit. Nothing is sent anywhere until [save] runs.
@immutable
class ProfileDraftState {
  final String? name;
  final String? surname;
  final String? biography;
  final bool saving;

  /// Bumped on [discard] so the text fields rebuild from the baseline
  /// instead of keeping the abandoned edits.
  final int revision;

  const ProfileDraftState({
    this.name,
    this.surname,
    this.biography,
    this.saving = false,
    this.revision = 0,
  });

  ProfileDraftState copyWith({
    String? name,
    String? surname,
    String? biography,
    bool? saving,
    int? revision,
  }) {
    return ProfileDraftState(
      name: name ?? this.name,
      surname: surname ?? this.surname,
      biography: biography ?? this.biography,
      saving: saving ?? this.saving,
      revision: revision ?? this.revision,
    );
  }
}

/// Edits the local profile draft and pushes it with `PATCH /user/profile`.
class ProfileDraftNotifier extends Notifier<ProfileDraftState> {
  bool _disposed = false;

  @override
  ProfileDraftState build() {
    ref.onDispose(() => _disposed = true);
    return const ProfileDraftState();
  }

  void setName(String value) => state = state.copyWith(name: value);
  void setSurname(String value) => state = state.copyWith(surname: value);
  void setBiography(String value) => state = state.copyWith(biography: value);

  String effectiveName(UserModel? user) => state.name ?? user?.name ?? '';
  String effectiveSurname(UserModel? user) =>
      state.surname ?? user?.surname ?? '';
  String effectiveBiography(UserModel? user) =>
      state.biography ?? user?.biography ?? '';

  /// Whether any draft differs from the saved [user] values.
  bool isDirty(UserModel? user) {
    return effectiveName(user) != (user?.name ?? '') ||
        effectiveSurname(user) != (user?.surname ?? '') ||
        effectiveBiography(user) != (user?.biography ?? '');
  }

  /// Drops every edit and restores the baseline values.
  void discard() {
    if (state.saving) return;
    state = ProfileDraftState(revision: state.revision + 1);
  }

  /// Pushes only the changed fields to the backend, then mirrors them into
  /// SQLite and the user store. Returns true on success, false when
  /// offline/rejected (the draft is kept so the user can retry).
  Future<bool> save(UserModel? user) async {
    if (state.saving) return false;
    final uuid = ref.read(userStoreProvider).localUserUUID;
    if (uuid.isEmpty) return false;

    final baseName = user?.name ?? '';
    final baseSurname = user?.surname ?? '';
    final baseBiography = user?.biography ?? '';
    // Only edits that differ from the saved values go over the wire —
    // untouched fields (and edits reverted to the baseline) are omitted.
    final name = state.name != null && state.name != baseName
        ? state.name
        : null;
    final surname = state.surname != null && state.surname != baseSurname
        ? state.surname
        : null;
    final biography =
        state.biography != null && state.biography != baseBiography
        ? state.biography
        : null;
    if (name == null && surname == null && biography == null) return true;

    state = state.copyWith(saving: true);
    try {
      final res = await apiGateway.user.profile.updateInfo.partial(
        name: name,
        surname: surname,
        biography: biography,
      );
      if (!res.success) {
        if (!_disposed) state = state.copyWith(saving: false);
        return false;
      }
      final effectiveName = name ?? baseName;
      final effectiveSurname = surname ?? baseSurname;
      final effectiveBiography = biography ?? baseBiography;
      final db = AppDatabase.instance;
      await db.user.profile.name.update(uuid, effectiveName);
      await db.user.profile.surname.update(uuid, effectiveSurname);
      await db.user.profile.biography.update(uuid, effectiveBiography);
      ref
          .read(userStoreProvider.notifier)
          .onProfileUpdate(uuid, {
            'name': effectiveName,
            'surname': effectiveSurname,
            'biography': effectiveBiography,
          });
    } catch (e) {
      debugPrint('[ProfileDraft] save failed: $e');
      if (!_disposed) state = state.copyWith(saving: false);
      return false;
    }
    if (_disposed) return false;
    // Kept as explicit values (they now match the new baseline), so the
    // text fields show exactly what was saved without rebuilding.
    state = state.copyWith(saving: false);
    return true;
  }
}

/// Provider for the profile draft edited in Account > Edit Profile.
final profileDraftProvider =
    NotifierProvider<ProfileDraftNotifier, ProfileDraftState>(
      ProfileDraftNotifier.new,
    );
