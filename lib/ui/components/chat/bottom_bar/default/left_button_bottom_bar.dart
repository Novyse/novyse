import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class LeftButtonBottomBar extends StatefulWidget {
  const LeftButtonBottomBar({
    super.key,
    required this.isRecording,
    this.isAttachMenuOpen = false,
    this.onToggleAttachMenu,
    required this.onCancelRecording,
  });

  final bool isRecording;
  final bool isAttachMenuOpen;
  final VoidCallback? onToggleAttachMenu;
  final VoidCallback onCancelRecording;

  @override
  State<LeftButtonBottomBar> createState() => _LeftButtonBottomBarState();
}

class _LeftButtonBottomBarState extends State<LeftButtonBottomBar>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animController;
  late final Animation<double> _rotationAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _rotationAnim = Tween<double>(begin: 0.0, end: math.pi / 4).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );

    if (widget.isRecording || widget.isAttachMenuOpen) {
      _animController.value = 1.0;
    }
  }

  @override
  void didUpdateWidget(covariant LeftButtonBottomBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    final shouldRotate = widget.isRecording || widget.isAttachMenuOpen;
    final wasRotated = oldWidget.isRecording || oldWidget.isAttachMenuOpen;

    if (shouldRotate != wasRotated) {
      if (shouldRotate) {
        _animController.forward();
      } else {
        _animController.reverse();
      }
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _handlePress() {
    if (widget.isRecording) {
      widget.onCancelRecording();
    } else {
      widget.onToggleAttachMenu?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final tooltip = widget.isRecording
        ? l10n.cancelRecordingTooltip
        : l10n.attachFilesTooltip;

    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _handlePress,
          borderRadius: BorderRadius.circular(24),
          child: Container(
            width: 45,
            height: 45,
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest.withValues(
                alpha: 0.65,
              ),
              shape: BoxShape.circle,
              border: Border.all(
                color: colorScheme.outlineVariant.withValues(alpha: 0.5),
              ),
            ),
            alignment: Alignment.center,
            child: AnimatedBuilder(
              animation: _rotationAnim,
              builder: (context, child) {
                return Transform.rotate(
                  angle: _rotationAnim.value,
                  child: child,
                );
              },
              child: AppHugeIcon(
                icon: HugeIcons.strokeRoundedAdd01,
                size: 22,
                color: colorScheme.onSurface,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
