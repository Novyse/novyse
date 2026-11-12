import 'package:flutter/painting.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:novyse/core/settings/settings_models.dart';
import 'package:novyse/core/stores/profile_draft_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/utils/profile_gradient_ui.dart';


DateTime? loadProfileBirthday(WidgetRef ref) {
  final localUser = ref.watch(localUserProvider);
  final draft = ref.watch(profileDraftProvider);
  final effective = draft.birthday ?? localUser?.birthday ?? '';
  return DateTime.tryParse(effective);
}

void saveProfileBirthday(WidgetRef ref, DateTime value) {
  ref
      .read(profileDraftProvider.notifier)
      .setBirthday(DateFormat('yyyy-MM-dd').format(value));
}

void clearProfileBirthday(WidgetRef ref) {
  ref.read(profileDraftProvider.notifier).clearBirthday();
}

SettingColorValue loadProfileNameColor(WidgetRef ref) =>
    _loadProfileColor(ref, _ProfileColorField.name);

SettingColorValue loadProfileBannerColor(WidgetRef ref) =>
    _loadProfileColor(ref, _ProfileColorField.banner);

SettingColorValue loadProfileCardColor(WidgetRef ref) =>
    _loadProfileColor(ref, _ProfileColorField.card);

void saveProfileNameColor(
  WidgetRef ref,
  LinearGradient gradient,
  double angle,
) => _saveProfileColor(ref, _ProfileColorField.name, gradient, angle);

void saveProfileBannerColor(
  WidgetRef ref,
  LinearGradient gradient,
  double angle,
) => _saveProfileColor(ref, _ProfileColorField.banner, gradient, angle);

void saveProfileCardColor(
  WidgetRef ref,
  LinearGradient gradient,
  double angle,
) => _saveProfileColor(ref, _ProfileColorField.card, gradient, angle);

void clearProfileNameColor(WidgetRef ref) =>
    ref.read(profileDraftProvider.notifier).clearNameColor();

void clearProfileBannerColor(WidgetRef ref) =>
    ref.read(profileDraftProvider.notifier).clearBannerColor();

void clearProfileCardColor(WidgetRef ref) =>
    ref.read(profileDraftProvider.notifier).clearCardColor();

enum _ProfileColorField { name, banner, card }

SettingColorValue _loadProfileColor(WidgetRef ref, _ProfileColorField field) {
  final localUser = ref.watch(localUserProvider);
  final draft = ref.watch(profileDraftProvider);
  final effective = switch (field) {
    _ProfileColorField.name =>
      draft.nameColorTouched ? draft.nameColor : localUser?.nameColor,
    _ProfileColorField.banner =>
      draft.bannerColorTouched ? draft.bannerColor : localUser?.bannerColor,
    _ProfileColorField.card =>
      draft.cardColorTouched ? draft.cardColor : localUser?.cardColor,
  };
  final preview = field == _ProfileColorField.name &&
          localUser?.displayName.trim().isNotEmpty == true
      ? localUser!.displayName
      : null;
  return SettingColorValue(
    gradient: effective == null
        ? null
        : linearGradientFromProfileGradient(effective),
    angle: effective?.angle ?? 90,
    previewText: preview,
  );
}

void _saveProfileColor(
  WidgetRef ref,
  _ProfileColorField field,
  LinearGradient gradient,
  double angle,
) {
  final profile = profileGradientFromLinearGradient(gradient, angle);
  final notifier = ref.read(profileDraftProvider.notifier);
  switch (field) {
    case _ProfileColorField.name:
      notifier.setNameColor(profile);
    case _ProfileColorField.banner:
      notifier.setBannerColor(profile);
    case _ProfileColorField.card:
      notifier.setCardColor(profile);
  }
}
