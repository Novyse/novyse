import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';
import 'package:novyse/ui/components/huge_icon.dart';


class ChatOverviewAppBar extends StatelessWidget {
  const ChatOverviewAppBar({
    super.key,
    required this.title,
    required this.subtitle,
    required this.subtitleHighlighted,
    required this.avatarUuid,
    required this.seedKey,
    required this.isOnline,
    required this.isSavedMessages,
    required this.chatType,
    required this.onBack,
  });

  final String title;
  final String subtitle;
  final bool subtitleHighlighted;
  final String? avatarUuid;
  final String seedKey;
  final bool isOnline;
  final bool isSavedMessages;
  final String? chatType;

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

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
      ],
    );

    return ProgressiveOpacityBackground(child: content);
  }
}
