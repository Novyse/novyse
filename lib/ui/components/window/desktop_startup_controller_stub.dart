abstract final class DesktopStartupController {
  static bool get isSupported => false;

  static bool get isEnabled => false;

  static Future<bool> setOpenOnStartup({
    required bool enabled,
    bool openInBackground = false,
  }) async => false;

  static Future<void> syncWithSettings({
    required bool openOnStartup,
    required bool openInBackground,
  }) async {}
}
