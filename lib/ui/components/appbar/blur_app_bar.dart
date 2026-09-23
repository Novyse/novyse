import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:novyse/ui/components/appbar/scrolled_under.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';

/// Standard Material 3 app bar with a frosted-glass background that only
/// appears once content scrolls underneath it.
///
/// Drop-in replacement for [AppBar] inside [Scaffold.appBar]: same layout
/// slots ([leading]/[title]/[actions]/[bottom]), transparent base, blur +
/// surface tint driven by [scrolledUnder]. When [scrolledUnder] is null (or
/// false) the bar stays fully transparent.
class BlurAppBar extends StatelessWidget implements PreferredSizeWidget {
  const BlurAppBar({
    super.key,
    this.leading,
    this.title,
    this.actions,
    this.bottom,
    this.scrolledUnder,
    this.centerTitle,
    this.titleSpacing,
    this.leadingWidth,
    this.systemOverlayStyle,
  });

  final Widget? leading;
  final Widget? title;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;

  /// Drives the blur background. Wire it with [ScrolledUnderScope] placed
  /// around the page body.
  final ValueListenable<bool>? scrolledUnder;

  final bool? centerTitle;
  final double? titleSpacing;
  final double? leadingWidth;
  final SystemUiOverlayStyle? systemOverlayStyle;

  static const _blurSigma = 18.0;

  @override
  Size get preferredSize =>
      Size.fromHeight(kToolbarHeight + (bottom?.preferredSize.height ?? 0.0));

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    Widget background = const SizedBox.shrink();
    final listenable = scrolledUnder;
    if (listenable != null) {
      background = ValueListenableBuilder<bool>(
        valueListenable: listenable,
        builder: (context, value, _) {
          if (!value) return const SizedBox.shrink();
          return ClipRect(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: _blurSigma, sigmaY: _blurSigma),
              child: Container(
                color: colorScheme.surface.withValues(alpha: 0.6),
              ),
            ),
          );
        },
      );
    }

    return AppBar(
      leading: leading,
      title: title,
      actions: actions,
      bottom: bottom,
      centerTitle: centerTitle,
      titleSpacing: titleSpacing,
      leadingWidth: leadingWidth,
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      flexibleSpace: background,
      systemOverlayStyle:
          systemOverlayStyle ??
          (colorScheme.brightness == Brightness.dark
              ? SystemUiOverlayStyle.light
              : SystemUiOverlayStyle.dark),
    );
  }
}
