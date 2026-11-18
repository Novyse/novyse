import 'package:material_ui/material_ui.dart';

bool get showCustomTitleBar => false;

class DesktopWindowFrame extends StatelessWidget {
  const DesktopWindowFrame({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => child;
}
