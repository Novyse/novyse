import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Base template for every settings page.
///
/// Provides the floating app bar (same pill style as the rest of the app,
/// so it is written once) and prints [children] — typically
/// [SettingsSection]s — in a centered column (`maxWidth` 768, like
/// `production` `SettingsPageScrollview`).
class SettingsPageTemplate extends StatelessWidget {
  const SettingsPageTemplate({
    super.key,
    required this.title,
    this.subtitle,
    required this.children,
    this.showBack = true,
    this.onBack,
    this.actions,
    this.bottom,
    this.maxWidth = 768,
  });

  final String title;
  final String? subtitle;
  final List<Widget> children;

  /// Shows the floating back pill. The root settings page passes false.
  final bool showBack;

  /// Defaults to `Navigator.maybePop`.
  final VoidCallback? onBack;

  /// Trailing action widgets, rendered in their own floating pill.
  final List<Widget>? actions;

  /// Extra widget under the app bar (same slot as chat app bars).
  final Widget? bottom;

  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final topInset = MediaQuery.paddingOf(context).top;
    final backHandler = onBack;

    final spaced = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      spaced.add(children[i]);
      if (i < children.length - 1) {
        spaced.add(const SizedBox(height: 20));
      }
    }

    return Scaffold(
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: SizedBox(height: topInset + 76)),
              SliverToBoxAdapter(
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: maxWidth),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 96),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: spaced,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: AnnotatedRegion<SystemUiOverlayStyle>(
              value: colorScheme.brightness == Brightness.dark
                  ? SystemUiOverlayStyle.light
                  : SystemUiOverlayStyle.dark,
              child: _SettingsFloatingAppBar(
                title: title,
                subtitle: subtitle,
                showBack: showBack,
                onBack: backHandler ?? () => Navigator.of(context).maybePop(),
                actions: actions,
                bottom: bottom,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsFloatingAppBar extends StatelessWidget {
  const _SettingsFloatingAppBar({
    required this.title,
    this.subtitle,
    required this.showBack,
    required this.onBack,
    this.actions,
    this.bottom,
  });

  final String title;
  final String? subtitle;
  final bool showBack;
  final VoidCallback onBack;
  final List<Widget>? actions;
  final Widget? bottom;

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
    final extraActions = actions;
    final subtitleText = subtitle;

    final content = Row(
      children: [
        if (showBack) ...[
          _pill(
            scheme: colorScheme,
            padding: const EdgeInsets.all(2),
            child: IconButton(
              icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedArrowLeft01),
              onPressed: onBack,
            ),
          ),
          const SizedBox(width: _pillSpacing),
        ],
        Expanded(
          child: _pill(
            scheme: colorScheme,
            radius: 28,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            child: Semantics(
              header: true,
              child: Column(
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
                    textAlign: TextAlign.center,
                  ),
                  if (subtitleText != null && subtitleText.isNotEmpty)
                    Text(
                      subtitleText,
                      style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                    ),
                ],
              ),
            ),
          ),
        ),
        if (extraActions != null && extraActions.isNotEmpty) ...[
          const SizedBox(width: _pillSpacing),
          _pill(
            scheme: colorScheme,
            padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
            child: Row(mainAxisSize: MainAxisSize.min, children: extraActions),
          ),
        ] else if (showBack) ...[
          // Balances the back pill so the title stays centered,
          // like `production` HeaderWithBackArrow's right spacer.
          const SizedBox(width: 52),
        ],
      ],
    );

    return ProgressiveOpacityBackground(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          content,
          if (bottom != null) ...[const SizedBox(height: 12), bottom!],
        ],
      ),
    );
  }
}
