import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/utils/platform.dart';

abstract final class WindowDefaults {
  static const initialSize = Size(1280, 720);
  static const minimumSize = Size(360, 600);

  static const logoAsset = 'assets/images/novyse-icon-logo.png';
}

@immutable
class WindowChromeStyle {
  const WindowChromeStyle({
    required this.titleBarHeight,
    required this.buttonWidth,
    required this.buttonHeight,
    required this.iconSize,
    required this.iconStrokeWidth,
    required this.logoSize,
    required this.titleBarPaddingLeft,
    required this.resizeEdgeSize,
    required this.buttonAnimation,
    required this.closeHoverColor,
    required this.closeHoverIconColor,
    this.hoverBackgroundAlpha = 0.12,
    this.iconOpacity = 0.85,
  });

  final double titleBarHeight;
  final double buttonWidth;
  final double buttonHeight;
  final double iconSize;
  final double iconStrokeWidth;
  final double logoSize;
  final double titleBarPaddingLeft;
  final double resizeEdgeSize;
  final Duration buttonAnimation;
  final Color closeHoverColor;
  final Color closeHoverIconColor;
  final double hoverBackgroundAlpha;
  final double iconOpacity;

  static const _base = WindowChromeStyle(
    titleBarHeight: 40,
    buttonWidth: 46,
    buttonHeight: 40,
    iconSize: 18,
    iconStrokeWidth: 1.8,
    logoSize: 40,
    titleBarPaddingLeft: 8,
    resizeEdgeSize: 8,
    buttonAnimation: Duration(milliseconds: 120),
    closeHoverColor: Color(0xFFE81123),
    closeHoverIconColor: Colors.white,
  );

  static const windows = _base;
  static const macos = _base;
  static const linux = _base;

  static WindowChromeStyle resolve([AppOS os = AppOS.windows]) {
    return switch (currentOS) {
      AppOS.windows => windows,
      AppOS.macos => macos,
      AppOS.linux => linux,
      _ => _base,
    };
  }

  WindowChromeStyle copyWith({
    double? titleBarHeight,
    double? buttonWidth,
    double? buttonHeight,
    double? iconSize,
    double? iconStrokeWidth,
    double? logoSize,
    double? titleBarPaddingLeft,
    double? resizeEdgeSize,
    Duration? buttonAnimation,
    Color? closeHoverColor,
    Color? closeHoverIconColor,
    double? hoverBackgroundAlpha,
    double? iconOpacity,
  }) {
    return WindowChromeStyle(
      titleBarHeight: titleBarHeight ?? this.titleBarHeight,
      buttonWidth: buttonWidth ?? this.buttonWidth,
      buttonHeight: buttonHeight ?? this.buttonHeight,
      iconSize: iconSize ?? this.iconSize,
      iconStrokeWidth: iconStrokeWidth ?? this.iconStrokeWidth,
      logoSize: logoSize ?? this.logoSize,
      titleBarPaddingLeft:
          titleBarPaddingLeft ?? this.titleBarPaddingLeft,
      resizeEdgeSize: resizeEdgeSize ?? this.resizeEdgeSize,
      buttonAnimation: buttonAnimation ?? this.buttonAnimation,
      closeHoverColor: closeHoverColor ?? this.closeHoverColor,
      closeHoverIconColor:
          closeHoverIconColor ?? this.closeHoverIconColor,
      hoverBackgroundAlpha:
          hoverBackgroundAlpha ?? this.hoverBackgroundAlpha,
      iconOpacity: iconOpacity ?? this.iconOpacity,
    );
  }
}

abstract final class WindowButtonStyle {
  static const minimizeIcon = HugeIcons.strokeRoundedMinusSign;
  static const maximizeIcon = HugeIcons.strokeRoundedSquare;
  static const restoreIcon = HugeIcons.strokeRoundedCopy01;
  static const closeIcon = HugeIcons.strokeRoundedCancel01;
  static const logoFallbackIcon = HugeIcons.strokeRoundedChat01;

  static const minimizeTooltip = 'Riduci a icona';
  static const maximizeTooltip = 'Ingrandisci';
  static const restoreTooltip = 'Ripristina';
  static const closeTooltip = 'Chiudi';
}

@immutable
class WindowChromeColors {
  const WindowChromeColors({
    required this.titleBarBackground,
    required this.buttonHoverBackground,
    required this.iconColor,
    required this.logoFallbackColor,
  });

  final Color titleBarBackground;
  final Color buttonHoverBackground;
  final Color iconColor;
  final Color logoFallbackColor;

  factory WindowChromeColors.fromScheme(
    ColorScheme scheme,
    WindowChromeStyle style,
  ) {
    return WindowChromeColors(
      titleBarBackground: scheme.surface,
      buttonHoverBackground: scheme.primary.withValues(
        alpha: style.hoverBackgroundAlpha,
      ),
      iconColor: scheme.onSurface.withValues(alpha: style.iconOpacity),
      logoFallbackColor: scheme.primary,
    );
  }
}
