abstract final class DesktopTrayController {
  static bool get isInitialized => false;

  static Future<void> init() async {}

  static void refreshLabels() {}

  static void setIconAsset(String asset) {}

  static Future<void> dispose() async {}
}
