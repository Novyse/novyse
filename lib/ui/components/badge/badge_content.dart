import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/badge/user_badge.dart';
import 'package:novyse/ui/components/huge_icon.dart';

List<List<dynamic>>? badgeIconFromName(String? name) {
  if (name == null || name.isEmpty) return null;
  switch (name) {
    case 'UserIcon':
      return HugeIcons.strokeRoundedUser;
    case 'AlphaIcon':
      return HugeIcons.strokeRoundedAlpha;
    case 'Shield01Icon':
      return HugeIcons.strokeRoundedShield01;
    case 'StarIcon':
      return HugeIcons.strokeRoundedStar;
    case 'CheckmarkCircle02Icon':
      return HugeIcons.strokeRoundedCheckmarkCircle02;
    case 'FavouriteIcon':
      return HugeIcons.strokeRoundedFavourite;
    case 'SmileIcon':
      return HugeIcons.strokeRoundedSmile;
    case 'FireIcon':
      return HugeIcons.strokeRoundedFire02;
    case 'CrownIcon':
      return HugeIcons.strokeRoundedCrown;
    case 'VerifyIcon':
    case 'VerifiedIcon':
      return HugeIcons.strokeRoundedTick02;
    default:
      return null;
  }
}


class BadgeContent extends StatelessWidget {
  const BadgeContent({super.key, required this.badge, this.textColor});

  final UserBadge badge;
  final Color? textColor;

  @override
  Widget build(BuildContext context) {
    final color = textColor ?? Theme.of(context).colorScheme.onSurface;
    final icon = badgeIconFromName(badge.icon);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) AppHugeIcon(icon: icon, size: 12, color: color),
        if (icon != null) const SizedBox(width: 6),
        Text(
          badge.name,
          style: TextStyle(
            color: color,
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
