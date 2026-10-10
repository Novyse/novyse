import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/ui/components/badge/animated_gradient_badge.dart';
import 'package:novyse/ui/components/badge/badge_variants.dart';
import 'package:novyse/ui/components/badge/user_badge.dart';

/// User badges from `GET /user/profile/badges`.
final userBadgesProvider =
    FutureProvider.family<List<UserBadge>, String>((ref, userUUID) async {
  if (userUUID.isEmpty) return const [];
  try {
    final res = await apiGateway.user.profile.badges.get(userUUID);
    if (!res.success || res.badges == null) return const [];
    return [
      for (final raw in res.badges!)
        if (raw is Map)
          UserBadge.fromMap(Map<String, dynamic>.from(raw)),
    ];
  } catch (_) {
    return const [];
  }
});


class BadgeRenderer extends StatelessWidget {
  const BadgeRenderer({super.key, required this.badge});

  final UserBadge badge;

  @override
  Widget build(BuildContext context) {
    switch (badge.color.type) {
      case BadgeColorType.gradientAnimated:
        return AnimatedGradientBadge(badge: badge);
      case BadgeColorType.gradientStatic:
        return StaticGradientBadge(badge: badge);
      case BadgeColorType.solid:
        return SolidBadge(badge: badge);
    }
  }
}

/// Row of badges owned by the user.
class Badges extends ConsumerWidget {
  const Badges({super.key, required this.userUUID});

  final String userUUID;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final badgesAsync = ref.watch(userBadgesProvider(userUUID));

    return badgesAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (badges) {
        if (badges.isEmpty) return const SizedBox.shrink();
        return IgnorePointer(
          child: Wrap(
            spacing: 10,
            runSpacing: 10,
            alignment: WrapAlignment.start,
            children: [
              for (final badge in badges)
                BadgeRenderer(key: ValueKey(badge.id), badge: badge),
            ],
          ),
        );
      },
    );
  }
}
