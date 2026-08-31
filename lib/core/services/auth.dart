import 'package:novyse_auth/novyse_auth.dart';

import 'package:novyse/core/config/global.dart' as config;
import 'package:novyse/core/utils/platform.dart';

import 'package:novyse/core/events/event_bus.dart';
import 'package:novyse/core/events/events.dart';

/// Maps the config string to the SDK [Branch] enum.
final Branch _branch = switch (config.branch) {
  'production' => Branch.production,
  'preview' => Branch.preview,
  _ => Branch.development,
};

/// Maps [currentPlatform] to the SDK [Platform] enum.
final Platform _platform = switch (currentPlatform) {
  AppPlatform.mobile => Platform.mobile,
  AppPlatform.desktop => Platform.desktop,
  AppPlatform.web => Platform.web,
};

/// Global [NovyseAuth] singleton.
final auth = NovyseAuth(
  NovyseAuthOptions(branch: _branch, platform: _platform),
);

/// Bootstrap hook — call once at app startup with the [EventBus].
void initAuth(EventBus eventBus) {
  auth.token.onInvalidSession(() {
    eventBus.emit(const InvalidSessionEvent());
  });
}
