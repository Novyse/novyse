abstract final class DesktopWindowController {
  static bool get isCustomChromeEnabled => false;

  static Future<void> init() async {}

  static bool get isMaximized => false;

  static void minimize() {}

  static void toggleMaximize({bool? maximized}) {}

  static void close({bool hideToTray = false}) {}

  static void showWindow() {}

  static void quitApp() {}

  static void startDragging() {}

  static bool get isFullscreen => false;

  static void setFullscreen(bool value) {}

  static int? addMaximizedListener(void Function(bool isMaximized) onChanged) =>
      null;

  static void removeMaximizedListener(int? listenerId) {}
}
