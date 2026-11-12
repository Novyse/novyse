import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/pages/app/settings/settings_catalog_page.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/profile/profile_card.dart';

class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_refreshLocalProfileFromApi());
    });
  }

  Future<void> _refreshLocalProfileFromApi() async {
    final user = ref.read(localUserProvider);
    final handle = user?.handle?.trim();
    final uuid = user?.uuid;
    if (handle == null || handle.isEmpty || uuid == null || uuid.isEmpty) {
      return;
    }
    try {
      final res = await apiGateway.user.profile.get.byHandle(handle);
      if (!mounted || !res.success || res.user == null) return;
      final payload = Map<String, dynamic>.from(res.user!);
      payload['uuid'] = uuid;
      payload['name'] ??= user!.name;
      await AppDatabase.instance.user.add(payload);
      if (!mounted) return;
      ref.read(userStoreProvider.notifier).onProfileUpdate(uuid, payload);
    } catch (_) {
    }
  }

  void _openEditProfile(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => const SettingsGroupPage(
          categoryId: 'account',
          pageId: 'account_profile',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final bottomClearance =
        media.padding.bottom + FloatingConsts.tabBarHeight + 24;

    return Scaffold(
      body: Padding(
        padding: EdgeInsets.fromLTRB(
          16,
          media.padding.top + 12,
          16,
          bottomClearance,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: _EditProfileButton(
                onPressed: () => _openEditProfile(context),
              ),
            ),
            const SizedBox(height: 12),
            const Expanded(
              child: Center(
                child: ScaledProfileCard(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EditProfileButton extends StatelessWidget {
  const _EditProfileButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final l10n = context.l10n;
    return Material(
      color: scheme.surfaceContainerHighest.withValues(alpha: 0.72),
      borderRadius: BorderRadius.circular(FloatingConsts.pillRadius),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(FloatingConsts.pillRadius),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppHugeIcon(
                icon: HugeIcons.strokeRoundedPencilEdit02,
                size: 18,
                color: scheme.onSurface,
              ),
              const SizedBox(width: 8),
              Text(
                l10n.profileEditTitle,
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: scheme.onSurface,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
