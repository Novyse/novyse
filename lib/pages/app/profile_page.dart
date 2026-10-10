import 'dart:io' as io;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/services/profile_picture_service.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/badge/badges.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/profile/profile_qr_code_modal.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final localUser = ref.watch(localUserProvider);
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    final displayName = localUser?.displayName.isNotEmpty == true
        ? localUser!.displayName
        : (localUser?.name.isNotEmpty == true ? localUser!.name : 'User');
    final rawHandle = localUser?.handle?.isNotEmpty == true
        ? localUser!.handle!
        : '';
    final handle = rawHandle.isNotEmpty ? '@$rawHandle' : '';
    final biography = localUser?.biography?.isNotEmpty == true
        ? localUser!.biography!
        : null;
    final birthday = localUser?.birthday?.isNotEmpty == true
        ? localUser!.birthday!
        : null;
    final country = localUser?.country?.isNotEmpty == true
        ? localUser!.country!
        : null;

    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.only(bottom: 96),
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              _ProfileBanner(bannerUUID: localUser?.bannerPictureUUID),
              // Bottom-to-top banner fade with the name on top of it.
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: ProgressiveOpacityBackground(
                  direction: ProgressiveOpacityDirection.bottomToTop,
                  padding: const EdgeInsets.fromLTRB(144, 0, 20, 6),
                  applySafeArea: false,
                  fadeHeight: 76,
                  child: Text(
                    displayName,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      shadows: const [
                        Shadow(
                          blurRadius: 8,
                          color: Colors.black54,
                        ),
                      ],
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
              Positioned(
                top: MediaQuery.paddingOf(context).top + 8,
                left: 8,
                child: _QrButton(
                  username: rawHandle,
                  profilePictureUUID: localUser?.profilePictureUUID,
                ),
              ),
              // Avatar half outside the banner.
              Positioned(
                left: 20,
                bottom: -56,
                child: Avatar(
                  uuid: localUser?.profilePictureUUID,
                  name: displayName,
                  size: 112,
                  isOnline: false,
                ),
              ),
            ],
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // @username outside the image, aligned with the name.
                if (handle.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(left: 124),
                    child: Text(
                      handle,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: scheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                const SizedBox(height: 64),

                Badges(userUUID: localUser?.uuid ?? ''),
                const SizedBox(height: 16),

                if (biography != null) _ProfileAboutMe(biography: biography),

                if (biography != null &&
                    (birthday != null || country != null))
                  const SizedBox(height: 16),
                if (birthday != null || country != null)
                  _ProfileBirthdayLocation(
                    birthday: birthday,
                    country: country,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}


class _QrButton extends StatelessWidget {
  const _QrButton({required this.username, this.profilePictureUUID});

  final String username;
  final String? profilePictureUUID;

  @override
  Widget build(BuildContext context) {
    if (username.isEmpty) return const SizedBox.shrink();
    return Material(
      color: Colors.transparent,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: () => showProfileQrCodeModal(
          context,
          username: username,
          profilePictureUUID: profilePictureUUID,
        ),
        child: const Padding(
          padding: EdgeInsets.all(8),
          child: AppHugeIcon(
            icon: HugeIcons.strokeRoundedQrCode,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}

class _ProfileBanner extends ConsumerWidget {
  const _ProfileBanner({required this.bannerUUID});

  static const defaultBannerUri =
      'https://www.novyse.com/images/banner/default.jpg';

  final String? bannerUUID;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bannerAsync = (bannerUUID != null && bannerUUID!.isNotEmpty)
        ? ref.watch(profilePictureUriProvider(bannerUUID))
        : null;
    final uri = bannerAsync?.valueOrNull;

    Widget? image;
    if (uri != null && uri.isNotEmpty) {
      if (uri.startsWith('http://') ||
          uri.startsWith('https://') ||
          uri.startsWith('blob:')) {
        image = Image.network(
          uri,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => const SizedBox.shrink(),
        );
      } else if (!kIsWeb) {
        final cleanPath = uri.startsWith('file://')
            ? uri.replaceFirst('file://', '')
            : uri;
        image = Image.file(
          io.File(cleanPath),
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => const SizedBox.shrink(),
        );
      }
    }

    return SizedBox(
      height: 190,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Default banner underneath; the real one covers it when available.
          Image.network(
            defaultBannerUri,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => const SizedBox.shrink(),
          ),
          if (image != null) Positioned.fill(child: image),
        ],
      ),
    );
  }
}

class _ProfileAboutMe extends StatelessWidget {
  const _ProfileAboutMe({required this.biography});

  final String biography;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Text(biography, style: theme.textTheme.bodyMedium),
      ),
    );
  }
}

class _ProfileBirthdayLocation extends StatelessWidget {
  const _ProfileBirthdayLocation({this.birthday, this.country});

  final String? birthday;
  final String? country;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final isItalian =
        Localizations.localeOf(context).languageCode.toLowerCase() == 'it';
    final birthdayValue = birthday;
    final countryValue = country;
    final hasBirthday =
        birthdayValue != null && birthdayValue.isNotEmpty;
    final hasCountry = countryValue != null && countryValue.isNotEmpty;

    if (!hasBirthday && !hasCountry) {
      return const SizedBox.shrink();
    }

    Widget item({
      required List<List<dynamic>> icon,
      required String label,
      required String value,
    }) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: scheme.primary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: AppHugeIcon(icon: icon, size: 16, color: Colors.white),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                Text(value, style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
        ],
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
        child: Column(
          children: [
            if (hasBirthday)
              item(
                icon: HugeIcons.strokeRoundedBirthdayCake,
                label: isItalian ? 'NATO IL' : 'BORN',
                value: birthdayValue,
              ),
            if (hasBirthday && hasCountry)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Divider(
                  height: 17,
                  color: scheme.outlineVariant,
                ),
              ),
            if (hasCountry)
              Padding(
                padding: EdgeInsets.only(top: hasBirthday ? 16 : 0),
                child: item(
                  icon: HugeIcons.strokeRoundedLocation06,
                  label: isItalian ? 'LUOGO' : 'LOCATION',
                  value: countryValue,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
