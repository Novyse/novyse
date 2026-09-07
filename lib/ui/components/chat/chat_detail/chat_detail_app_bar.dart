import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
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
    required this.callOpen,
    required this.onBack,
    required this.onOpenSearch,
    required this.onToggleCall,
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
  final bool callOpen;
  final VoidCallback onBack;
  final VoidCallback onOpenSearch;
  final VoidCallback onToggleCall;
  final Widget? bottom;

  static const _pillSpacing = 8.0;

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
            child: Semantics(
              header: true,
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
        ),
        const SizedBox(width: _pillSpacing),
        _pill(
          scheme: colorScheme,
          padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!callOpen)
                IconButton(
                  icon: AppHugeIcon(
                    icon: HugeIcons.strokeRoundedSearch01,
                    color: colorScheme.onSurface,
                  ),
                  onPressed: onOpenSearch,
                ),
              IconButton(
                icon: AppHugeIcon(
                  icon: callOpen
                      ? HugeIcons.strokeRoundedChat01
                      : HugeIcons.strokeRoundedAudioWave01,
                  color: colorScheme.onSurface,
                ),
                onPressed: onToggleCall,
              ),
            ],
          ),
        ),
      ],
    );

    return ProgressiveOpacityBackground(
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              content,
              if (bottom != null) ...[const SizedBox(height: 8), bottom!],
            ],
          ),
        ),
      ),
    );
  }
}
