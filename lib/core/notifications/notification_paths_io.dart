import 'dart:io';

String? notificationExecutableDir() {
  try {
    return File(Platform.resolvedExecutable).parent.path;
  } catch (_) {
    return null;
  }
}
