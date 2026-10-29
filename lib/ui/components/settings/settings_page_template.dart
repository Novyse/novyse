import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/effects/progressive_opacity_background.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';
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
    this.appBarContent,
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

  /// Replaces the default title + actions row (e.g. with a search field,
  /// like the chat list/detail searching state). [bottom] still applies.
  final Widget? appBarContent;

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
              SliverToBoxAdapter(child: SizedBox(height: topInset + 78)),
              SliverToBoxAdapter(
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: maxWidth),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 96),
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
                contentOverride: appBarContent,
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
    this.contentOverride,
  });

  final String title;
  final String? subtitle;
  final bool showBack;
  final VoidCallback onBack;
  final List<Widget>? actions;
  final Widget? bottom;

  /// When non-null, replaces the default title + actions row entirely.
  final Widget? contentOverride;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final extraActions = actions;
    final subtitleText = subtitle;
    final override = contentOverride;

    final Widget content;
    if (override != null) {
      content = override;
    } else {
      content = Row(
        children: [
          if (showBack) ...[
            FloatingPill(
              padding: FloatingConsts.iconPillPadding,
              child: FloatingIconButton(
                icon: const AppHugeIcon(
                  icon: HugeIcons.strokeRoundedArrowLeft01,
                ),
                onPressed: onBack,
              ),
            ),
            const SizedBox(width: FloatingConsts.pillSpacing),
          ] else if (extraActions != null && extraActions.isNotEmpty) ...[
            // Mirrors the actions pill on the right so the title stays
            // centered (e.g. settings root: no back button, search action).
            const SizedBox(width: FloatingConsts.iconPillOuterSize),
            const SizedBox(width: FloatingConsts.pillSpacing),
          ],
          Expanded(
            child: FloatingPill(
              radius: FloatingConsts.centralRadius,
              padding: FloatingConsts.centralTitlePadding,
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  minHeight: FloatingConsts.centralMinHeight,
                ),
                child: Semantics(
                  header: true,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        title,
                        style: FloatingConsts.titleStyle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                      if (subtitleText != null && subtitleText.isNotEmpty)
                        Text(
                          subtitleText,
                          style: FloatingConsts.subtitleStyle(
                            colorScheme,
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
          ),
          if (extraActions != null && extraActions.isNotEmpty) ...[
            const SizedBox(width: FloatingConsts.pillSpacing),
            FloatingPill(
              padding: FloatingConsts.iconPillPadding,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: extraActions,
              ),
            ),
          ] else if (showBack) ...[
            // Balances the back pill so the title stays centered,
            // like `production` HeaderWithBackArrow's right spacer.
            // The gap mirrors the one after the back pill.
            const SizedBox(width: FloatingConsts.pillSpacing),
            const SizedBox(width: FloatingConsts.iconPillOuterSize),
          ],
        ],
      );
    }

    return ProgressiveOpacityBackground(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          content,
          if (bottom != null) ...[
            const SizedBox(height: FloatingConsts.bottomGap),
            bottom!,
          ],
        ],
      ),
    );
  }
}
