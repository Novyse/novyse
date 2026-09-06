import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:window_manager/window_manager.dart';

bool get showCustomTitleBar {
  if (kIsWeb) return false;
  try {
    if (Platform.environment.containsKey('FLUTTER_TEST')) return false;
  } catch (_) {}
  return currentPlatform == AppPlatform.desktop;
}

class DesktopWindowFrame extends StatelessWidget {
  const DesktopWindowFrame({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!showCustomTitleBar) return child;
    return Column(
      children: [
        const CustomTitleBar(),
        Expanded(child: child),
      ],
    );
  }
}

class CustomTitleBar extends StatefulWidget {
  const CustomTitleBar({super.key});

  @override
  State<CustomTitleBar> createState() => _CustomTitleBarState();
}

class _CustomTitleBarState extends State<CustomTitleBar> with WindowListener {
  bool _isMaximized = false;

  @override
  void initState() {
    super.initState();
    windowManager.addListener(this);
    _refreshMaximized();
  }

  @override
  void dispose() {
    windowManager.removeListener(this);
    super.dispose();
  }

  Future<void> _refreshMaximized() async {
    try {
      final maximized = await windowManager.isMaximized();
      if (mounted && maximized != _isMaximized) {
        setState(() => _isMaximized = maximized);
      }
    } catch (_) {}
  }

  @override
  void onWindowMaximize() => setState(() => _isMaximized = true);

  @override
  void onWindowUnmaximize() => setState(() => _isMaximized = false);

  Future<void> _onMinimize() async {
    try {
      await windowManager.minimize();
    } catch (_) {}
  }

  Future<void> _onMaximizeToggle() async {
    try {
      if (_isMaximized) {
        await windowManager.unmaximize();
      } else {
        await windowManager.maximize();
      }
    } catch (_) {}
  }

  Future<void> _onClose() async {
    try {
      await windowManager.close();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final background = scheme.surface;
    return Container(
      height: 40,
      decoration: BoxDecoration(
        color: background,
      ),
      child: Row(
        children: [
          Expanded(
            child: DragToMoveArea(
              child: GestureDetector(
                onDoubleTap: _onMaximizeToggle,
                child: Container(
                  height: 40,
                  padding: const EdgeInsets.only(left: 8),
                  alignment: Alignment.centerLeft,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Image.asset(
                        'assets/images/novyse-icon-logo.png',
                        width: 40,
                        height: 40,
                        errorBuilder: (_, _, _) => AppHugeIcon(
                          icon: HugeIcons.strokeRoundedChat01,
                          size: 24,
                          color: scheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          _WindowButton(
            icon: HugeIcons.strokeRoundedMinusSign,
            tooltip: 'Riduci a icona',
            onPressed: _onMinimize,
          ),
          _WindowButton(
            icon: _isMaximized
                ? HugeIcons.strokeRoundedCopy01
                : HugeIcons.strokeRoundedSquare,
            tooltip: _isMaximized ? 'Ripristina' : 'Ingrandisci',
            onPressed: _onMaximizeToggle,
          ),
          _WindowButton(
            icon: HugeIcons.strokeRoundedCancel01,
            tooltip: 'Chiudi',
            onPressed: _onClose,
            hoverColor: const Color(0xFFE81123),
            hoverIconColor: Colors.white,
          ),
        ],
      ),
    );
  }
}

class _WindowButton extends StatefulWidget {
  const _WindowButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.hoverColor,
    this.hoverIconColor,
  });

  final List<List<dynamic>> icon;
  final String tooltip;
  final VoidCallback onPressed;
  final Color? hoverColor;
  final Color? hoverIconColor;

  @override
  State<_WindowButton> createState() => _WindowButtonState();
}

class _WindowButtonState extends State<_WindowButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final bg = _hovered
        ? (widget.hoverColor ?? scheme.primary.withValues(alpha: 0.12))
        : Colors.transparent;
    final iconColor = _hovered && widget.hoverIconColor != null
        ? widget.hoverIconColor!
        : scheme.onSurface.withValues(alpha: 0.85);
    return Semantics(
      label: widget.tooltip,
      button: true,
      child: MouseRegion(
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: widget.onPressed,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 120),
            width: 46,
            height: 40,
            color: bg,
            alignment: Alignment.center,
            child: AppHugeIcon(
              icon: widget.icon,
              size: 18,
              color: iconColor,
              strokeWidth: 1.8,
            ),
          ),
        ),
      ),
    );
  }
}
