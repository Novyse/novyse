import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Textual info of the comms bar: live indicator + chat/sub + participant count.
class CommsBarInfo extends StatelessWidget {
  const CommsBarInfo({
    super.key,
    required this.chatName,
    this.subName,
    required this.participantsLabel,
  });

  final String chatName;
  final String? subName;
  final String participantsLabel;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final title = (subName != null && subName!.isNotEmpty)
        ? '$chatName (#$subName)'
        : chatName;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SizedBox(
          width: FloatingAppBarConsts.barContentSize,
          height: FloatingAppBarConsts.barContentSize,
          child: Center(
            child: AppHugeIcon(
              icon: HugeIcons.strokeRoundedCall02,
              size: FloatingAppBarConsts.barIconSize,
              color: scheme.primary,
            ),
          ),
        ),
        const SizedBox(width: FloatingAppBarConsts.subHeaderContentGap),
        Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: scheme.onSurface,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                participantsLabel,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: scheme.onSurfaceVariant,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
