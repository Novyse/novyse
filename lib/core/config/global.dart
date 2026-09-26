library;

/// The active deployment branch.
const String branch = 'development'; // 'development' | 'preview' | 'production'

/// Application metadata.
const String appName = branch == 'production'
    ? 'Novyse'
    : (branch == 'preview' ? 'Novyse.preview' : 'Novyse.dev');

const String desktopDescription = branch == 'production'
    ? 'A desktop client for Novyse'
    : (branch == 'preview'
          ? 'A desktop client for Novyse (Preview)'
          : 'A desktop client for Novyse (Development)');
const String mobileDescription = branch == 'production'
    ? 'A mobile client for Novyse'
    : (branch == 'preview'
          ? 'A mobile client for Novyse (Preview)'
          : 'A mobile client for Novyse (Development)');
const String webDescription = branch == 'production'
    ? 'A web client for Novyse'
    : (branch == 'preview'
          ? 'A web client for Novyse (Preview)'
          : 'A web client for Novyse (Development)');

const String appVersion = '1.2.0-20260831.0';

// Domain helpers

/// Returns the full domain for [subdomain] based on the current [branch].
///
/// - production  → `<sub>.novyse.com`
/// - preview     → `<sub>.preview.novyse.com`
/// - development → `<sub>.dev.novyse.com`
String getDomain(String subdomain) {
  final suffix = switch (branch) {
    'production' => '',
    'preview' => '.preview',
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
  'preview' => 'https://app.preview.novyse.com',
  _ => 'https://app.novyse.com',
};

const String tinyAppUrl = 'https://vyse.me';
const String landingPageUrl = 'https://www.novyse.com';
final String privacyPolicyUrl = '$landingPageUrl/legal/privacy-policy';
final String tosUrl = '$landingPageUrl/legal/terms-of-service';

// Third-party keys

const String cloudflareTurnstilePublic = '0x4AAAAAACvBX17HadrEqUCS';
