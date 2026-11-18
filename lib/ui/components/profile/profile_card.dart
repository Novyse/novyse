import 'dart:math' as math;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/gestures.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:intl/intl.dart';
import 'package:novyse/core/services/api/modules/user_module.dart';
import 'package:novyse/core/services/profile_picture_service.dart';
import 'package:novyse/core/storage/file/file_uri.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/utils/profile_gradient_ui.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/badge/badges.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/profile/profile_qr_code_modal.dart';

const double kProfileBannerAspectRatio = 17 / 6;
const double kProfileCardDesignWidth = 500;
const double kProfileCardDesignHeight = 700;
const double kProfileBannerDesignHeight =
    kProfileCardDesignWidth / kProfileBannerAspectRatio;
const double kProfileCardRadius = 20;
const double _kAvatarSize = 112;
const double _kAvatarOverhang = 56;

class ScaledProfileCard extends ConsumerWidget {
  const ScaledProfileCard({super.key, this.user});

  final UserModel? user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxW = constraints.maxWidth;
        final maxH = constraints.maxHeight;
        if (!maxW.isFinite ||
            !maxH.isFinite ||
            maxW <= 0 ||
            maxH <= 0) {
          return const SizedBox.shrink();
        }
        final scale = math.min(
          maxW / kProfileCardDesignWidth,
          maxH / kProfileCardDesignHeight,
        );
        final width = kProfileCardDesignWidth * scale;
        final height = kProfileCardDesignHeight * scale;
        return SizedBox(
          width: width,
          height: height,
          child: FittedBox(
            fit: BoxFit.contain,
            child: SizedBox(
              width: kProfileCardDesignWidth,
              height: kProfileCardDesignHeight,
              child: ProfileCard(user: user),
            ),
          ),
        );
      },
    );
  }
}

/// Fixed-size profile surface. Prefer [ScaledProfileCard] in pages.
/// GIF dims to 30% on hover; on touch, tap toggles the same dim.
class ProfileCard extends ConsumerStatefulWidget {
  const ProfileCard({super.key, this.user});

  final UserModel? user;

  @override
  ConsumerState<ProfileCard> createState() => _ProfileCardState();
}

class _ProfileCardState extends ConsumerState<ProfileCard> {
  bool _hovered = false;
  bool _tapDimmed = false;
  PointerDeviceKind _lastPointerKind = PointerDeviceKind.touch;

  bool get _gifDimmed => _hovered || _tapDimmed;

  void _onCardTap() {
    // Touch/stylus sticky dim; mouse uses hover.
    if (_lastPointerKind != PointerDeviceKind.touch &&
        _lastPointerKind != PointerDeviceKind.stylus) {
      return;
    }
    setState(() => _tapDimmed = !_tapDimmed);
  }

  @override
  Widget build(BuildContext context) {
    final localUser = widget.user ?? ref.watch(localUserProvider);
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

    final cardColor = localUser?.cardColor;
    final hasGif =
        localUser?.cardPictureUUID != null &&
        localUser!.cardPictureUUID!.isNotEmpty;

    return SizedBox(
      width: kProfileCardDesignWidth,
      height: kProfileCardDesignHeight,
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: Listener(
          onPointerDown: (event) => _lastPointerKind = event.kind,
          child: GestureDetector(
            onTap: hasGif ? _onCardTap : null,
            child: ClipRRect(
            borderRadius: BorderRadius.circular(kProfileCardRadius),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: cardColor == null || cardColor.stops.isEmpty
                    ? scheme.surface
                    : null,
                gradient: cardColor != null && cardColor.stops.isNotEmpty
                    ? linearGradientFromProfileGradient(cardColor)
                    : null,
              ),
              child: Stack(
                clipBehavior: Clip.hardEdge,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SizedBox(
                        height: kProfileBannerDesignHeight,
                        child: _ProfileBanner(
                          bannerUUID: localUser?.bannerPictureUUID,
                          bannerColor: localUser?.bannerColor,
                        ),
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(20, 6, 20, 20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
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
                              const SizedBox(height: _kAvatarOverhang),
                              Expanded(
                                child: SingleChildScrollView(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Badges(
                                        userUUID: localUser?.uuid ?? '',
                                      ),
                                      const SizedBox(height: 16),
                                      if (biography != null)
                                        _ProfileAboutMe(biography: biography),
                                      if (biography != null &&
                                          (birthday != null ||
                                              country != null))
                                        const SizedBox(height: 16),
                                      if (birthday != null || country != null)
                                        _ProfileBirthdayLocation(
                                          birthday: birthday,
                                          country: country,
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  Positioned(
                    left: 0,
                    right: 0,
                    top: kProfileBannerDesignHeight - 28,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(144, 0, 20, 0),
                      child: _ProfileName(
                        displayName: displayName,
                        nameColor: localUser?.nameColor,
                      ),
                    ),
                  ),
                  Positioned(
                    top: 8,
                    left: 8,
                    child: _QrButton(
                      username: rawHandle,
                      profilePictureUUID: localUser?.profilePictureUUID,
                    ),
                  ),
                  Positioned(
                    left: 20,
                    top: kProfileBannerDesignHeight - _kAvatarOverhang,
                    child: Avatar(
                      uuid: localUser?.profilePictureUUID,
                      name: displayName,
                      size: _kAvatarSize,
                      isOnline: false,
                    ),
                  ),
                  if (hasGif)
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: IgnorePointer(
                        child: AnimatedOpacity(
                          opacity: _gifDimmed ? 0.3 : 1.0,
                          duration: const Duration(milliseconds: 150),
                          child: _CardGifOverlay(
                            cardPictureUUID: localUser.cardPictureUUID,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          ),
        ),
      ),
    );
  }
}

class _CardGifOverlay extends ConsumerWidget {
  const _CardGifOverlay({required this.cardPictureUUID});

  final String? cardPictureUUID;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uuid = cardPictureUUID;
    if (uuid == null || uuid.isEmpty) return const SizedBox.shrink();
    final uriAsync = ref.watch(profilePictureUriProvider(uuid));
    final uri = uriAsync.valueOrNull;
    if (uri == null || uri.isEmpty) return const SizedBox.shrink();

    ImageProvider? provider;
    if (uri.startsWith('http://') ||
        uri.startsWith('https://') ||
        uri.startsWith('blob:')) {
      provider = NetworkImage(uri);
    } else if (!kIsWeb) {
      provider = FileImage(fileFromUri(uri));
    }
    if (provider == null) return const SizedBox.shrink();

    return Image(
      image: provider,
      width: kProfileCardDesignWidth,
      fit: BoxFit.fitWidth,
      alignment: Alignment.topLeft,
      gaplessPlayback: true,
      filterQuality: FilterQuality.medium,
      errorBuilder: (_, _, _) => const SizedBox.shrink(),
    );
  }
}

class _ProfileName extends StatelessWidget {
  const _ProfileName({required this.displayName, this.nameColor});

  final String displayName;
  final ProfileGradient? nameColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final text = Text(
      displayName,
      style: theme.textTheme.headlineSmall?.copyWith(
        fontWeight: FontWeight.w800,
        color: Colors.white,
        shadows: const [Shadow(blurRadius: 8, color: Colors.black54)],
      ),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
    );
    final gradient = nameColor;
    if (gradient == null || gradient.stops.isEmpty) return text;
    return ShaderMask(
      shaderCallback: (bounds) => linearGradientFromProfileGradient(gradient)
          .createShader(Rect.fromLTWH(0, 0, bounds.width, bounds.height)),
      blendMode: BlendMode.srcIn,
      child: text,
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
  const _ProfileBanner({required this.bannerUUID, this.bannerColor});

  final String? bannerUUID;
  final ProfileGradient? bannerColor;

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
        image = Image.file(
          fileFromUri(uri),
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => const SizedBox.shrink(),
        );
      }
    }

    final color = bannerColor;
    return Stack(
      fit: StackFit.expand,
      children: [
        if (color != null && color.stops.isNotEmpty)
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: linearGradientFromProfileGradient(color),
            ),
          ),
        if (image != null) Positioned.fill(child: image),
      ],
    );
  }
}

class _ProfileAboutMe extends StatelessWidget {
  const _ProfileAboutMe({required this.biography});

  final String biography;

  @override
  Widget build(BuildContext context) {
    return Text(biography, style: Theme.of(context).textTheme.bodyMedium);
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
    final birthdayValue = birthday;
    final countryValue = country;
    final hasBirthday = birthdayValue != null && birthdayValue.isNotEmpty;
    final hasCountry = countryValue != null && countryValue.isNotEmpty;

    if (!hasBirthday && !hasCountry) {
      return const SizedBox.shrink();
    }

    final birthdayParsed =
        hasBirthday ? DateTime.tryParse(birthdayValue) : null;
    final birthdayLabel = birthdayParsed == null
        ? birthdayValue
        : DateFormat('dd/MM/yyyy').format(birthdayParsed);

    Widget row({
      required List<List<dynamic>> icon,
      required String value,
    }) {
      return Row(
        children: [
          AppHugeIcon(icon: icon, size: 20, color: scheme.onSurfaceVariant),
          const SizedBox(width: 12),
          Expanded(
            child: Text(value, style: theme.textTheme.bodyMedium),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (hasBirthday)
          row(
            icon: HugeIcons.strokeRoundedBirthdayCake,
            value: birthdayLabel!,
          ),
        if (hasBirthday && hasCountry) const SizedBox(height: 12),
        if (hasCountry)
          row(
            icon: HugeIcons.strokeRoundedLocation06,
            value: countryValue,
          ),
      ],
    );
  }
}
