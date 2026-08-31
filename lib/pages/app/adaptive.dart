import 'package:flutter/material.dart';

const double kMasterDetailBreakpoint = 720;
const double kMasterPaneWidth = 360;

bool isMasterDetailLayout(BuildContext context) {
  return MediaQuery.sizeOf(context).width >= kMasterDetailBreakpoint;
}
