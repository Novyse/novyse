import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/router/chat_routes.dart';
import 'package:novyse/core/stores/favorite_messages_store.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:novyse/ui/components/settings/settings_navigation_row.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';

class OverviewActionsCard extends ConsumerWidget {
  const OverviewActionsCard({
    super.key,
    required this.chatUUID,
    required this.subID,
  });

  final String chatUUID;
  final int subID;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final favoritesState = ref.watch(favoriteMessagesProvider(chatUUID));
    final favoritesCount = favoritesState.favorites.length;

    void wip() {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.overviewWip)));
    }

    void openFavorites() {
      context.push(chatFavoritesPath(chatUUID, subID));
    }

    Future<void> confirmLeave() async {
      final confirmed = await showOverlayConfirm(
        context,
        title: l10n.overviewLeaveConfirmTitle,
        message: l10n.overviewLeaveConfirmMessage,
        confirmLabel: l10n.overviewLeave,
        cancelLabel: l10n.cancel,
        isDanger: true,
      );
      if (confirmed == true && context.mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(l10n.overviewWip)));
      }
    }

    return SettingsSection(
      children: [
        SettingsNavigationRow(
          icon: HugeIcons.strokeRoundedSettings01,
          title: l10n.overviewSettings,
          onTap: wip,
        ),
        SettingsNavigationRow(
          icon: HugeIcons.strokeRoundedFavourite,
          title: l10n.favoriteMessages,
          trailingText: favoritesCount > 0 ? '$favoritesCount' : null,
          onTap: openFavorites,
        ),
        SettingsNavigationRow(
          icon: HugeIcons.strokeRoundedLogout01,
          title: l10n.overviewLeave,
          danger: true,
          onTap: confirmLeave,
        ),
      ],
    );
  }
}
