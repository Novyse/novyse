import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
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

  static const _pillSpacing = 12.0;

  Widget _pill({
    required ColorScheme scheme,
    required Widget child,
    EdgeInsetsGeometry padding = EdgeInsets.zero,
    double radius = 100,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: scheme.surface.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(color: scheme.outline.withValues(alpha: 0.25)),
          ),
          child: child,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    final content = Row(
      children: [
        _pill(
          scheme: colorScheme,
          padding: const EdgeInsets.all(2),
          child: IconButton(
            icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedArrowLeft01),
            onPressed: onBack,
          ),
        ),
        const SizedBox(width: _pillSpacing),
        Expanded(
          child: _pill(
            scheme: colorScheme,
            radius: 28,
            padding: const EdgeInsets.fromLTRB(2, 2, 2, 2),
            child: Row(
              children: [
                Avatar(
                  uuid: avatarUuid,
                  name: title,
                  seedKey: seedKey,
                  size: 40,
                  isOnline: isOnline,
                  isSavedMessages: isSavedMessages,
                  type: chatType,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
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
