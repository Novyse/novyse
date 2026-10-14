import 'package:flutter/material.dart';
import 'package:novyse/core/chat/chat_audio_service.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu.dart';
import 'package:novyse/ui/components/context_menu/app_context_menu_item.dart';

/// Shows the playback-speed picker as the app's standard context menu,
/// anchored above the speed chip. Returns the picked speed, if any.
Future<double?> showVoiceSpeedMenu(
  BuildContext anchorContext,
  double currentSpeed,
  String Function(double) formatSpeed,
) async {
  final renderBox = anchorContext.findRenderObject() as RenderBox?;
  final overlay =
      Overlay.of(anchorContext, rootOverlay: true).context.findRenderObject()
          as RenderBox?;
  if (renderBox == null || overlay == null) return null;

  const steps = ChatAudioService.speedSteps;
  const menuWidth = 90.0;
  const itemHeight = AppMenuTokens.itemHeight;
  final menuHeight = steps.length * itemHeight + AppMenuTokens.padding * 2;

  final chipTopLeft = renderBox.localToGlobal(Offset.zero, ancestor: overlay);
  final chipSize = renderBox.size;
  // Anchor at the chip's bottom edge: showAppMenu opens below, or flips above
  // when there is no room under the chip.
  final anchor = Offset(
    chipTopLeft.dx + chipSize.width - menuWidth,
    chipTopLeft.dy + chipSize.height,
  );

  double? picked;
  await showAppMenu(
    context: anchorContext,
    anchor: anchor,
    width: menuWidth,
    estimatedHeight: menuHeight,
    builder: (close) => Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final step in steps)
          AppMenuItem(
            label: formatSpeed(step),
            selected: step == currentSpeed,
            onTap: () {
              picked = step;
              close();
            },
          ),
      ],
    ),
  );

  return picked;
}
