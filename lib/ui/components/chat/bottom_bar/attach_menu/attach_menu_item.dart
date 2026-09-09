import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Actions of the message-type (attach) menu.
enum AttachMenuAction { media, camera, file, recording, location, todo, poll }

extension AttachMenuActionConfig on AttachMenuAction {
  bool get enabled =>
      this == AttachMenuAction.media || this == AttachMenuAction.file;

  List<List<dynamic>> get icon {
    switch (this) {
      case AttachMenuAction.media:
        return HugeIcons.strokeRoundedAlbum01;
      case AttachMenuAction.camera:
        return HugeIcons.strokeRoundedCamera01;
      case AttachMenuAction.file:
        return HugeIcons.strokeRoundedFile01;
      case AttachMenuAction.recording:
        return HugeIcons.strokeRoundedRecord;
      case AttachMenuAction.location:
        return HugeIcons.strokeRoundedLocation06;
      case AttachMenuAction.todo:
        return HugeIcons.strokeRoundedTaskAdd01;
      case AttachMenuAction.poll:
        return HugeIcons.strokeRoundedTaskEdit01;
    }
  }
  String label(AppLocalizations l10n) {
    switch (this) {
      case AttachMenuAction.media:
        return l10n.attachMenuMedia;
      case AttachMenuAction.camera:
        return l10n.attachMenuCamera;
      case AttachMenuAction.file:
        return l10n.attachMenuFile;
      case AttachMenuAction.recording:
        return l10n.attachMenuRecording;
      case AttachMenuAction.location:
        return l10n.attachMenuLocation;
      case AttachMenuAction.todo:
        return l10n.attachMenuTodo;
      case AttachMenuAction.poll:
        return l10n.attachMenuPoll;
    }
  }
}

class AttachMenuItem extends StatelessWidget {
  const AttachMenuItem({
    super.key,
    required this.action,
    required this.label,
    required this.icon,
    required this.enabled,
    required this.onPressed,
    this.axis = Axis.horizontal,
    this.iconOnly = false,
  });

  final AttachMenuAction action;
  final String label;
  final List<List<dynamic>> icon;
  final bool enabled;
  final VoidCallback onPressed;
  final Axis axis;
  final bool iconOnly;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final iconColor = enabled
        ? colorScheme.onSurface
        : colorScheme.onSurfaceVariant.withValues(alpha: 0.4);

    if (iconOnly) {
      return Tooltip(
        message: label,
        child: Opacity(
          opacity: enabled ? 1.0 : 0.45,
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: enabled ? onPressed : null,
              borderRadius: BorderRadius.circular(20),
              child: SizedBox(
                width: 40,
                height: 40,
                child: Center(
                  child: AppHugeIcon(icon: icon, size: 20, color: iconColor),
                ),
              ),
            ),
          ),
        ),
      );
    }

    final content = axis == Axis.horizontal
        ? Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AppHugeIcon(icon: icon, size: 32, color: iconColor),
              const SizedBox(height: 6),
              Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(color: iconColor),
                textAlign: TextAlign.center,
              ),
            ],
          )
        : Row(
            children: [
              AppHugeIcon(icon: icon, size: 22, color: iconColor),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: theme.textTheme.bodyMedium?.copyWith(color: iconColor),
                ),
              ),
            ],
          );

    final button = InkWell(
      onTap: enabled ? onPressed : null,
      borderRadius: BorderRadius.circular(10),
      child: Padding(
        padding: axis == Axis.horizontal
            ? const EdgeInsets.symmetric(horizontal: 8, vertical: 6)
            : const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: content,
      ),
    );

    return Tooltip(
      message: label,
      child: Opacity(opacity: enabled ? 1.0 : 0.45, child: button),
    );
  }
}
