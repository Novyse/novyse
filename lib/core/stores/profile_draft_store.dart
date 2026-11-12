import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/services/api/modules/user_module.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/user_store.dart';

/// Draft of editable profile fields. Null / untouched colors follow the
/// local user until [save]; nothing is sent before then.
@immutable
class ProfileDraftState {
  final String? name;
  final String? surname;
  final String? biography;

  /// Null = untouched; `''` clears on save (`yyyy-MM-dd` when set).
  final String? birthday;

  /// Null + touched = explicit removal.
  final ProfileGradient? nameColor;
  final bool nameColorTouched;
  final ProfileGradient? bannerColor;
  final bool bannerColorTouched;
  final ProfileGradient? cardColor;
  final bool cardColorTouched;
  final bool saving;
  final int revision;

  const ProfileDraftState({
    this.name,
    this.surname,
    this.biography,
    this.birthday,
    this.nameColor,
    this.nameColorTouched = false,
    this.bannerColor,
    this.bannerColorTouched = false,
    this.cardColor,
    this.cardColorTouched = false,
    this.saving = false,
    this.revision = 0,
  });

  static const _keep = Object();

  ProfileDraftState copyWith({
    Object? name = _keep,
    Object? surname = _keep,
    Object? biography = _keep,
    Object? birthday = _keep,
    Object? nameColor = _keep,
    Object? nameColorTouched = _keep,
    Object? bannerColor = _keep,
    Object? bannerColorTouched = _keep,
    Object? cardColor = _keep,
    Object? cardColorTouched = _keep,
    Object? saving = _keep,
    Object? revision = _keep,
  }) {
    return ProfileDraftState(
      name: name == _keep ? this.name : name as String?,
      surname: surname == _keep ? this.surname : surname as String?,
      biography: biography == _keep ? this.biography : biography as String?,
      birthday: birthday == _keep ? this.birthday : birthday as String?,
      nameColor: nameColor == _keep
          ? this.nameColor
          : nameColor as ProfileGradient?,
      nameColorTouched: nameColorTouched == _keep
          ? this.nameColorTouched
          : nameColorTouched as bool,
      bannerColor: bannerColor == _keep
          ? this.bannerColor
          : bannerColor as ProfileGradient?,
      bannerColorTouched: bannerColorTouched == _keep
          ? this.bannerColorTouched
          : bannerColorTouched as bool,
      cardColor: cardColor == _keep
          ? this.cardColor
          : cardColor as ProfileGradient?,
      cardColorTouched: cardColorTouched == _keep
          ? this.cardColorTouched
          : cardColorTouched as bool,
      saving: saving == _keep ? this.saving : saving as bool,
      revision: revision == _keep ? this.revision : revision as int,
    );
  }
}

bool _gradientsEqual(ProfileGradient? a, ProfileGradient? b) {
  if (identical(a, b)) return true;
  if (a == null || b == null) return false;
  if (a.angle != b.angle || a.stops.length != b.stops.length) return false;
  for (var i = 0; i < a.stops.length; i++) {
    if (a.stops[i].color != b.stops[i].color ||
        a.stops[i].position != b.stops[i].position) {
      return false;
    }
  }
  return true;
}

class ProfileDraftNotifier extends Notifier<ProfileDraftState> {
  bool _disposed = false;

  @override
  ProfileDraftState build() {
    ref.onDispose(() => _disposed = true);
    return const ProfileDraftState();
  }

  void setName(String value) => state = state.copyWith(name: value);
  void setSurname(String value) => state = state.copyWith(surname: value);
  void setBiography(String value) =>
      state = state.copyWith(biography: value);

  void setBirthday(String value) =>
      state = state.copyWith(birthday: value);

  void clearBirthday() => state = state.copyWith(birthday: '');

  void setNameColor(ProfileGradient color) => state = state.copyWith(
    nameColor: color,
    nameColorTouched: true,
  );

  void clearNameColor() =>
      state = state.copyWith(nameColor: null, nameColorTouched: true);

  void setBannerColor(ProfileGradient color) => state = state.copyWith(
    bannerColor: color,
    bannerColorTouched: true,
  );

  void clearBannerColor() =>
      state = state.copyWith(bannerColor: null, bannerColorTouched: true);

  void setCardColor(ProfileGradient color) => state = state.copyWith(
    cardColor: color,
    cardColorTouched: true,
  );

  void clearCardColor() =>
      state = state.copyWith(cardColor: null, cardColorTouched: true);

  String effectiveName(UserModel? user) => state.name ?? user?.name ?? '';
  String effectiveSurname(UserModel? user) =>
      state.surname ?? user?.surname ?? '';
  String effectiveBiography(UserModel? user) =>
      state.biography ?? user?.biography ?? '';

  String effectiveBirthday(UserModel? user) =>
      state.birthday ?? user?.birthday ?? '';

  ProfileGradient? effectiveNameColor(UserModel? user) =>
      state.nameColorTouched ? state.nameColor : user?.nameColor;

  ProfileGradient? effectiveBannerColor(UserModel? user) =>
      state.bannerColorTouched ? state.bannerColor : user?.bannerColor;

  ProfileGradient? effectiveCardColor(UserModel? user) =>
      state.cardColorTouched ? state.cardColor : user?.cardColor;

  bool isDirty(UserModel? user) {
    if (effectiveName(user) != (user?.name ?? '')) return true;
    if (effectiveSurname(user) != (user?.surname ?? '')) return true;
    if (effectiveBiography(user) != (user?.biography ?? '')) return true;
    if (effectiveBirthday(user) != (user?.birthday ?? '')) return true;
    if (state.nameColorTouched &&
        !_gradientsEqual(state.nameColor, user?.nameColor)) {
      return true;
    }
    if (state.bannerColorTouched &&
        !_gradientsEqual(state.bannerColor, user?.bannerColor)) {
      return true;
    }
    if (state.cardColorTouched &&
        !_gradientsEqual(state.cardColor, user?.cardColor)) {
      return true;
    }
    return false;
  }

  void discard() {
    if (state.saving) return;
    state = ProfileDraftState(revision: state.revision + 1);
  }

  Future<bool> save(UserModel? user) async {
    if (state.saving) return false;
    final uuid = ref.read(userStoreProvider).localUserUUID;
    if (uuid.isEmpty) return false;

    final baseName = user?.name ?? '';
    final baseSurname = user?.surname ?? '';
    final baseBiography = user?.biography ?? '';
    final baseBirthday = user?.birthday ?? '';
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
    final birthdayDirty =
        state.birthday != null && state.birthday != baseBirthday;
    final nameColorDirty =
        state.nameColorTouched &&
        !_gradientsEqual(state.nameColor, user?.nameColor);
    final bannerColorDirty =
        state.bannerColorTouched &&
        !_gradientsEqual(state.bannerColor, user?.bannerColor);
    final cardColorDirty =
        state.cardColorTouched &&
        !_gradientsEqual(state.cardColor, user?.cardColor);
    if (name == null &&
        surname == null &&
        biography == null &&
        !birthdayDirty &&
        !nameColorDirty &&
        !bannerColorDirty &&
        !cardColorDirty) {
      return true;
    }

    state = state.copyWith(saving: true);
    try {
      if (name != null || surname != null || biography != null) {
        final res = await apiGateway.user.profile.updateInfo.partial(
          name: name,
          surname: surname,
          biography: biography,
        );
        if (!res.success) {
          if (!_disposed) state = state.copyWith(saving: false);
          return false;
        }
      }
      if (birthdayDirty) {
        final res = await apiGateway.user.profile.updateInfo.birthday(
          state.birthday!.isEmpty ? null : state.birthday,
        );
        if (!res.success) {
          if (!_disposed) state = state.copyWith(saving: false);
          return false;
        }
      }
      if (nameColorDirty) {
        final res = await apiGateway.user.profile.customization.nameColor(
          state.nameColor,
        );
        if (!res.success) {
          if (!_disposed) state = state.copyWith(saving: false);
          return false;
        }
      }
      if (bannerColorDirty) {
        final res = await apiGateway.user.profile.customization.bannerColor(
          state.bannerColor,
        );
        if (!res.success) {
          if (!_disposed) state = state.copyWith(saving: false);
          return false;
        }
      }
      if (cardColorDirty) {
        final res = await apiGateway.user.profile.customization.cardColor(
          state.cardColor,
        );
        if (!res.success) {
          if (!_disposed) state = state.copyWith(saving: false);
          return false;
        }
      }
      final effectiveName = name ?? baseName;
      final effectiveSurname = surname ?? baseSurname;
      final effectiveBiography = biography ?? baseBiography;
      final effectiveBirthday = birthdayDirty ? state.birthday! : baseBirthday;
      final effectiveNameColor = nameColorDirty
          ? state.nameColor
          : user?.nameColor;
      final effectiveBannerColor = bannerColorDirty
          ? state.bannerColor
          : user?.bannerColor;
      final effectiveCardColor = cardColorDirty
          ? state.cardColor
          : user?.cardColor;
      final db = AppDatabase.instance;
      await db.user.profile.name.update(uuid, effectiveName);
      await db.user.profile.surname.update(uuid, effectiveSurname);
      await db.user.profile.biography.update(uuid, effectiveBiography);
      await db.user.profile.birthday.update(
        uuid,
        effectiveBirthday.isEmpty ? null : effectiveBirthday,
      );
      await db.user.profile.nameColor.update(
        uuid,
        effectiveNameColor?.toJson(),
      );
      await db.user.profile.bannerColor.update(
        uuid,
        effectiveBannerColor?.toJson(),
      );
      await db.user.profile.cardColor.update(
        uuid,
        effectiveCardColor?.toJson(),
      );
      ref
          .read(userStoreProvider.notifier)
          .onProfileUpdate(uuid, {
            'name': effectiveName,
            'surname': effectiveSurname,
            'biography': effectiveBiography,
            'birthday': effectiveBirthday.isEmpty ? null : effectiveBirthday,
            'nameColor': effectiveNameColor?.toJson(),
            'bannerColor': effectiveBannerColor?.toJson(),
            'cardColor': effectiveCardColor?.toJson(),
          });
    } catch (e) {
      debugPrint('[ProfileDraft] save failed: $e');
      if (!_disposed) state = state.copyWith(saving: false);
      return false;
    }
    if (_disposed) return false;
    state = state.copyWith(saving: false);
    return true;
  }
}

final profileDraftProvider =
    NotifierProvider<ProfileDraftNotifier, ProfileDraftState>(
      ProfileDraftNotifier.new,
    );
