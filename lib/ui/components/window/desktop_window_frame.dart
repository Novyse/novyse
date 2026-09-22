import 'package:flutter/material.dart';
import 'package:nativeapi/nativeapi.dart' hide Image;
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/window/desktop_window_controller.dart';
import 'package:novyse/ui/components/window/window_style.dart';

bool get showCustomTitleBar => DesktopWindowController.isCustomChromeEnabled;

class DesktopWindowFrame extends StatelessWidget {
  const DesktopWindowFrame({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!showCustomTitleBar) return child;
    final style = WindowChromeStyle.resolve();
    return DragToResizeArea(
      resizeEdgeSize: style.resizeEdgeSize,
      child: Column(
        children: [
          const CustomTitleBar(),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class CustomTitleBar extends StatefulWidget {
  const CustomTitleBar({super.key});

  @override
  State<CustomTitleBar> createState() => _CustomTitleBarState();
}

class _CustomTitleBarState extends State<CustomTitleBar> {
  bool _isMaximized = false;
  int? _listenerId;

  @override
  void initState() {
    super.initState();
    _isMaximized = DesktopWindowController.isMaximized;
    _listenerId = DesktopWindowController.addMaximizedListener((maximized) {
      if (mounted && maximized != _isMaximized) {
        setState(() => _isMaximized = maximized);
      }
    });
  }

  @override
  void dispose() {
    DesktopWindowController.removeMaximizedListener(_listenerId);
    super.dispose();
  }

  void _syncMaximized() {
    final maximized = DesktopWindowController.isMaximized;
    if (mounted && maximized != _isMaximized) {
      setState(() => _isMaximized = maximized);
    }
  }

  void _onMinimize() => DesktopWindowController.minimize();

  void _onMaximizeToggle() {
    DesktopWindowController.toggleMaximize(maximized: _isMaximized);
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncMaximized());
  }

  void _onClose() => DesktopWindowController.close();

  @override
  Widget build(BuildContext context) {
    final style = WindowChromeStyle.resolve();
    final colors = WindowChromeColors.fromScheme(
      Theme.of(context).colorScheme,
      style,
    );
    return Container(
      height: style.titleBarHeight,
      decoration: BoxDecoration(color: colors.titleBarBackground),
      child: Row(
        children: [
          Expanded(
            child: DragToMoveArea(
              child: GestureDetector(
                behavior: HitTestBehavior.translucent,
                onDoubleTap: _onMaximizeToggle,
                onPanStart: (_) =>
                    DesktopWindowController.startDragging(),
                child: Container(
                  height: style.titleBarHeight,
                  padding: EdgeInsets.only(
                    left: style.titleBarPaddingLeft,
                  ),
                  alignment: Alignment.centerLeft,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Image.asset(
                        WindowDefaults.logoAsset,
                        width: style.logoSize,
                        height: style.logoSize,
                        errorBuilder: (_, _, _) => AppHugeIcon(
                          icon: WindowButtonStyle.logoFallbackIcon,
                          size: style.logoSize * 0.6,
                          color: colors.logoFallbackColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          _WindowButton(
            icon: WindowButtonStyle.minimizeIcon,
            tooltip: WindowButtonStyle.minimizeTooltip,
            onPressed: _onMinimize,
          ),
          _WindowButton(
            icon: _isMaximized
                ? WindowButtonStyle.restoreIcon
                : WindowButtonStyle.maximizeIcon,
            tooltip: _isMaximized
                ? WindowButtonStyle.restoreTooltip
                : WindowButtonStyle.maximizeTooltip,
            onPressed: _onMaximizeToggle,
          ),
          _WindowButton(
            icon: WindowButtonStyle.closeIcon,
            tooltip: WindowButtonStyle.closeTooltip,
            onPressed: _onClose,
            hoverColor: style.closeHoverColor,
            hoverIconColor: style.closeHoverIconColor,
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
    final style = WindowChromeStyle.resolve();
    final colors = WindowChromeColors.fromScheme(
      Theme.of(context).colorScheme,
      style,
    );
    final bg = _hovered
        ? (widget.hoverColor ?? colors.buttonHoverBackground)
        : Colors.transparent;
    final iconColor = _hovered && widget.hoverIconColor != null
        ? widget.hoverIconColor!
        : colors.iconColor;
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
            duration: style.buttonAnimation,
            width: style.buttonWidth,
            height: style.buttonHeight,
            color: bg,
            alignment: Alignment.center,
            child: AppHugeIcon(
              icon: widget.icon,
              size: style.iconSize,
              color: iconColor,
              strokeWidth: style.iconStrokeWidth,
            ),
          ),
        ),
      ),
    );
  }
}
