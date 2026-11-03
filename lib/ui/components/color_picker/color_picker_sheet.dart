import 'package:flutter/material.dart';

import 'package:novyse/ui/components/color_picker/novyse_color_picker.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';

/// Apre [NovyseColorPicker] in un overlay responsive
/// (bottom sheet su mobile, dialog su desktop/web).
///
/// La modalità è decisa da [mode]: [NovyseColorPickerMode.color] mostra
/// solo la tinta unita, [NovyseColorPickerMode.gradient] mostra solo il
/// gradient con [gradientColors] stop iniziali (default 2).
///
/// Solo per il gradient, se richiesto:
/// - [showGradientAngle]: slider 0-360° per la direzione ([initialAngle]
///   come punto di partenza in convenzione CSS, [onAngleChanged] ad ogni
///   cambio).
/// - [gradientPreviewText]: testo di esempio con il gradient applicato
///   sopra (live preview).
///
/// Il picker comunica tramite [onColorChanged]/[onGradientChanged] mentre
/// l'utente regola i controlli; non ritorna nulla alla chiusura.
Future<void> showColorPickerSheet({
  required BuildContext context,
  NovyseColorPickerMode mode = NovyseColorPickerMode.color,
  int gradientColors = 2,
  Color initialColor = const Color(0xFF0F6FFF),
  double initialAngle = 90.0,
  bool showGradientAngle = false,
  String? gradientPreviewText,
  ValueChanged<Color>? onColorChanged,
  ValueChanged<LinearGradient>? onGradientChanged,
  ValueChanged<double>? onAngleChanged,
}) {
  final gradient = mode == NovyseColorPickerMode.gradient;
  return ResponsiveOverlay.show<void>(
    context: context,
    title: gradient ? 'Gradient' : 'Colore',
    subtitle: gradient
        ? 'Regola i colori del gradient'
        : 'Scegli una tinta unita',
    mode: ResponsiveOverlayMode.dynamic,
    child: NovyseColorPicker(
      mode: mode,
      gradientColors: gradientColors,
      initialColor: initialColor,
      initialAngle: initialAngle,
      showGradientAngle: showGradientAngle,
      gradientPreviewText: gradientPreviewText,
      onColorChanged: onColorChanged,
      onGradientChanged: onGradientChanged,
      onAngleChanged: onAngleChanged,
    ),
  );
}
