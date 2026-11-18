import 'package:material_ui/material_ui.dart';

import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/color_picker/color_picker.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';

Future<void> showColorPickerSheet({
  required BuildContext context,
  ColorPickerMode mode = ColorPickerMode.color,
  bool allowModeSwitch = false,
  int gradientColors = 2,
  Color initialColor = const Color(0xFF0F6FFF),
  List<Color>? initialGradientColors,
  List<double>? initialGradientPositions,
  double initialAngle = 90.0,
  bool showGradientAngle = false,
  String? gradientPreviewText,
  ValueChanged<Color>? onColorChanged,
  ValueChanged<LinearGradient>? onGradientChanged,
  ValueChanged<double>? onAngleChanged,
}) {
  final l10n = context.l10n;
  return ResponsiveOverlay.show<void>(
    context: context,
    title: l10n.colorPickerTitle,
    mode: ResponsiveOverlayMode.dynamic,
    child: ColorPicker(
      mode: mode,
      allowModeSwitch: allowModeSwitch,
      gradientColors: gradientColors,
      initialColor: initialColor,
      initialGradientColors: initialGradientColors,
      initialGradientPositions: initialGradientPositions,
      initialAngle: initialAngle,
      showGradientAngle: showGradientAngle,
      gradientPreviewText: gradientPreviewText,
      onColorChanged: onColorChanged,
      onGradientChanged: onGradientChanged,
      onAngleChanged: onAngleChanged,
    ),
  );
}
