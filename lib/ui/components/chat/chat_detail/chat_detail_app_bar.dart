import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class ChatDetailAppBar extends StatelessWidget {
  const ChatDetailAppBar({
    super.key,
    required this.title,
    required this.subtitle,
    required this.subtitleHighlighted,
    required this.avatarUuid,
    required this.seedKey,
    required this.isOnline,
    required this.isSavedMessages,
    required this.chatType,
    required this.showVocal,
    required this.showSearch,
    required this.showViewToggle,
    required this.onBack,
    required this.onOpenSearch,
    required this.onToggleView,
    this.onOpenOverview,
    this.bottom,
  });

  final String title;
  final String subtitle;
  final bool subtitleHighlighted;
  final String? avatarUuid;
  final String seedKey;
  final bool isOnline;
  final bool isSavedMessages;
  final String? chatType;

  /// Whether the vocal panel is currently visible.
  final bool showVocal;

  /// Search is for MIXED / TEXT / ANNOUNCE only.
  final bool showSearch;

  /// Chat ↔ vocal toggle is for MIXED only.
  final bool showViewToggle;

  final VoidCallback onBack;
  final VoidCallback onOpenSearch;
  final VoidCallback onToggleView;
  final VoidCallback? onOpenOverview;
  final Widget? bottom;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final hasActions = showSearch || showViewToggle;

    final content = Row(
      children: [
        FloatingPill(
          padding: FloatingAppBarConsts.iconPillPadding,
          child: FloatingIconButton(
            icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedArrowLeft01),
            onPressed: onBack,
          ),
        ),
        const SizedBox(width: FloatingAppBarConsts.pillSpacing),
        Expanded(
          child: FloatingPill(
            radius: FloatingAppBarConsts.centralRadius,
            padding: FloatingAppBarConsts.centralAvatarPadding,
            child: Semantics(
              header: true,
              child: InkWell(
                borderRadius: BorderRadius.circular(
                  FloatingAppBarConsts.centralRadius,
                ),
                onTap: onOpenOverview,
                child: Row(
                  children: [
                    Avatar(
                      uuid: avatarUuid,
                      name: title,
                      seedKey: seedKey,
                      size: FloatingAppBarConsts.leadingSize,
                      isOnline: isOnline,
                      isSavedMessages: isSavedMessages,
                      type: chatType,
                      onTap: onOpenOverview,
                    ),
                    const SizedBox(width: FloatingAppBarConsts.leadingGap),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            title,
                            style: FloatingAppBarConsts.titleStyle,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (subtitle.isNotEmpty)
                            Text(
                              subtitle,
                              style: TextStyle(
                                fontSize: 12,
                                color: subtitleHighlighted
                                    ? colorScheme.primary
                                    : colorScheme.onSurfaceVariant,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (hasActions) ...[
          const SizedBox(width: FloatingAppBarConsts.pillSpacing),
          FloatingPill(
            padding: FloatingAppBarConsts.actionsPadding,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (showSearch)
                  FloatingIconButton(
                    icon: AppHugeIcon(
                      icon: HugeIcons.strokeRoundedSearch01,
                      color: colorScheme.onSurface,
                    ),
                    onPressed: onOpenSearch,
                  ),
                if (showViewToggle)
                  FloatingIconButton(
                    icon: AppHugeIcon(
                      icon: showVocal
                          ? HugeIcons.strokeRoundedChat01
                          : HugeIcons.strokeRoundedAudioWave01,
                      color: colorScheme.onSurface,
                    ),
                    onPressed: onToggleView,
                  ),
              ],
            ),
          ),
        ],
      ],
    );

    return ProgressiveOpacityBackground(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          content,
          if (bottom != null) ...[
            const SizedBox(height: FloatingAppBarConsts.bottomGap),
            bottom!,
          ],
        ],
      ),
    );
  }
}
