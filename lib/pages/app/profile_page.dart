import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/auth/onboarding_manager.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  Future<void> _handleLogout(BuildContext context, WidgetRef ref) async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.logoutConfirmTitle),
        content: Text(l10n.logoutConfirmMessage),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.danger,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(l10n.logout),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      await ref.read(authProvider.notifier).logout();
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final localUser = ref.watch(localUserProvider);
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    final displayName = localUser?.displayName.isNotEmpty == true
        ? localUser!.displayName
        : (localUser?.name.isNotEmpty == true ? localUser!.name : 'User');
    final handle = localUser?.handle?.isNotEmpty == true
        ? '@${localUser!.handle}'
        : '';
    final email = localUser?.email ?? '—';
    final biography = localUser?.biography?.isNotEmpty == true
        ? localUser!.biography!
        : '—';
    final region = localUser?.region?.isNotEmpty == true
        ? localUser!.region!
        : '—';
    final country = localUser?.country?.isNotEmpty == true
        ? localUser!.country!
        : '—';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            color: AppColors.danger,
            tooltip: l10n.logout,
            onPressed: () => _handleLogout(context, ref),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: [
          Center(
            child: Column(
              children: [
                Avatar(
                  uuid: localUser?.profilePictureUUID,
                  name: displayName,
                  size: 100,
                  isOnline: true,
                ),
                const SizedBox(height: 16),
                Text(
                  displayName,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (handle.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    handle,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.primary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Informazioni',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _ProfileInfoRow(label: 'Email', value: email),
                  _ProfileInfoRow(label: 'Biografia', value: biography),
                  _ProfileInfoRow(label: 'Regione', value: region),
                  _ProfileInfoRow(label: 'Paese', value: country),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () => ResponsiveOverlay.show(context: context),
            icon: const Icon(Icons.edit_outlined),
            label: const Text('Modifica profilo'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.danger,
              side: const BorderSide(color: AppColors.danger),
            ),
            onPressed: () => _handleLogout(context, ref),
            icon: const Icon(Icons.logout_rounded),
            label: Text(l10n.logout),
          ),
        ],
      ),
    );
  }
}

class _ProfileInfoRow extends StatelessWidget {
  final String label;
  final String value;

  const _ProfileInfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          Expanded(
            child: Text(value, style: Theme.of(context).textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }
}
