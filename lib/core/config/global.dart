library;

/// The active deployment branch.
const String branch = 'production'; // 'development' | 'production'

/// Application metadata.
const String appName = branch == 'production' ? 'Novyse' : 'Novyse.dev';

/// Application description used across all platforms.
const String appDescription =
    'Next-Gen Communications. Connect, collaborate, and communicate securely.';

const String appVersion = '1.3.1-20261020.0';

/// Human-readable update channel for the active deployment branch.
const String updateChannel = branch == 'development' ? 'dev' : branch;

/// Organization and author metadata.
const String authorName = 'Novyse';
const String authorEmail = 'contact@novyse.com';
const String authorUrl = 'https://www.novyse.com';

/// Copyright string dynamically resolved with current year.
int get currentYear => DateTime.now().year;
String get copyright => 'Copyright © $currentYear Novyse. All rights reserved.';

/// Licensing metadata.
const String projectLicense = 'GPL-3.0-or-later';
const String metadataLicense = 'CC0-1.0';

/// System identifiers and categories.
const String appId = branch == 'production' ? 'com.novyse' : 'com.novyse.dev';
const String desktopId = branch == 'production'
    ? 'com.novyse.novyse'
    : 'com.novyse.dev.novyse';
const String linuxCategories = 'Network;InstantMessaging;Chat;';
const String linuxKeywords = 'chat;messaging;voip;call;communication;novyse;';
const String macOSCategory = 'public.app-category.social-networking';
const List<String> webCategories = ['social', 'productivity', 'utilities'];

/// Platform schemes and identifiers.
const String appScheme = branch == 'production' ? 'novyse' : 'novyse.dev';

/// Installer / setup executable base name per branch.
const String installerName = branch == 'production'
    ? 'Novyse-Setup'
    : 'Novyse.dev-Setup';

/// Package name for Linux package managers (apt/deb, pacman, etc.).
const String packageName = branch == 'production' ? 'novyse' : 'novyse-dev';

/// Project repository URLs.
const String githubRepoUrl = 'https://github.com/Novyse/novyse';
const String issuesUrl = 'https://github.com/Novyse/novyse/issues';
const String releasesUrl = 'https://github.com/Novyse/novyse/releases';

/// Store and distribution URLs.
String get playStoreUrl =>
    'https://play.google.com/store/apps/details?id=$appId';
const String appStoreUrl = 'https://apps.apple.com/app/novyse';
const String snapStoreUrl = 'https://snapcraft.io/novyse';
const String flathubUrl = 'https://flathub.org/apps/com.novyse.novyse';

/// Stable desktop update feed URL.
String get desktopUpdaterArchiveUrl =>
    '$releasesUrl/latest/download/app-archive.json';

// Domain helpers

/// Returns the full domain for [subdomain] based on the current [branch].
///
/// - production  → `<sub>.novyse.com`
/// - development → `<sub>.dev.novyse.com`
String getDomain(String subdomain) {
  final suffix = switch (branch) {
    'production' => '',
    _ => '.dev',
  };
  return '$subdomain$suffix.novyse.com';
}

// API URLs

final String apiBaseUrl = 'https://${getDomain('api')}';
final String authBaseUrl = 'https://${getDomain('auth')}';
final String socketBaseUrl = 'wss://${getDomain('io')}';

// Web URLs

final String appUrl = switch (branch) {
  'development' => 'http://localhost:8081',
  _ => 'https://app.novyse.com',
};

const String tinyAppUrl = 'https://vyse.me';
const String landingPageUrl = 'https://www.novyse.com';
const String downloadPageUrl = 'https://www.novyse.com#download';
const String statusPageUrl = 'https://status.novyse.com';
const String privacyPolicyUrl = '$landingPageUrl/legal/privacy-policy';
const String tosUrl = '$landingPageUrl/legal/terms-of-service';

// Third-party keys

const String cloudflareTurnstilePublic = '0x4AAAAAACvBX17HadrEqUCS';
