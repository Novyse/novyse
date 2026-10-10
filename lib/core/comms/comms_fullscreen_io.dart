import 'package:novyse/ui/components/window/desktop_window_controller.dart';

void ioSetFullscreen(bool value) {
  try {
    DesktopWindowController.setFullscreen(value);
  } catch (_) {}
}

bool ioIsFullscreen() {
  try {
    return DesktopWindowController.isFullscreen;
  } catch (_) {
    return false;
  }
}
