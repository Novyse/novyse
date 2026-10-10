import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Bottom bar shown when the user cannot write in the active chat/sub.
class NoWriteBottomBar extends StatefulWidget {
  const NoWriteBottomBar({super.key});

  @override
  State<NoWriteBottomBar> createState() => _NoWriteBottomBarState();
}

class _NoWriteBottomBarState extends State<NoWriteBottomBar> {
  bool _isMuted = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    return FloatingPill(
      radius: FloatingAppBarConsts.centralRadius,
      padding: FloatingAppBarConsts.centralTitlePadding,
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          minHeight: FloatingAppBarConsts.centralMinHeight,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () => setState(() => _isMuted = !_isMuted),
            borderRadius: BorderRadius.circular(
              FloatingAppBarConsts.centralRadius,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AppHugeIcon(
                  icon: _isMuted
                      ? HugeIcons.strokeRoundedVolumeOff
                      : HugeIcons.strokeRoundedVolumeHigh,
                  color: _isMuted
                      ? colorScheme.onSurfaceVariant
                      : colorScheme.primary,
                  size: 22,
                ),
                const SizedBox(width: 10),
                Text(
                  _isMuted ? l10n.enableNotifications : l10n.muteNotifications,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
