import 'dart:math' as math;

import 'package:flutter/material.dart';

const double kMasterDetailBreakpoint = 720;
const double kMasterPaneWidth = 360;
const double kMasterPaneMinWidth = 280;
const double kMasterDetailMinDetailWidth = 360;

bool isMasterDetailLayout(BuildContext context) {
  return MediaQuery.sizeOf(context).width >= kMasterDetailBreakpoint;
}

double clampMasterPaneWidth(double width, double screenWidth) {
  if (!screenWidth.isFinite || screenWidth <= 0 || !width.isFinite) {
    return kMasterPaneWidth;
  }

  final maxWidth = math.max(
    kMasterPaneMinWidth,
    math.min(
      screenWidth - kMasterDetailMinDetailWidth,
      screenWidth * 0.6,
    ),
  );
  final minWidth = math.min(kMasterPaneMinWidth, maxWidth);
  return width.clamp(minWidth, maxWidth);
}
