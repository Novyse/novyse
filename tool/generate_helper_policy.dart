// Writes the portable helper policy Linux and Windows helpers require.
//
// desktop_updater only generates a helper policy for macOS
// (`release helper-policy`), so without this step released bundles ship an
// install helper that rejects every update with "packaged helper policy
// identity rejected" (Linux) or "Required install metadata file is
// unavailable" (Windows).
//
// Run it after `flutter build` and before packaging:
//   dart run tool/generate_helper_policy.dart \
//     --platform linux --bundle build/linux/x64/release/bundle \
//     --app-id com.novyse

import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
// The helper's own validator is the only way to be sure the emitted JSON is
// byte-identical to what the native code expects.
// ignore: implementation_imports
import 'package:desktop_updater/src/native_install_helper/policy.dart';
import 'package:novyse/core/updater/helper_policy.dart';

const String _defaultKeysFile = 'desktop_updater.keys.json';

String get _usage =>
    '''
Usage: dart run tool/generate_helper_policy.dart --platform <linux|windows> --app-id <id> [options]

Options:
  --platform <linux|windows>  Platform of the built bundle (required).
  --app-id <id>               Application package id, e.g. com.novyse.
  --bundle <dir>              Built bundle directory (default: build/<platform>/x64/release/bundle
                              or build/windows/x64/runner/Release).
  --app-binary <path>         Application executable (default: novyse / novyse.exe).
  --helper <path>             Install helper (default: located inside the bundle).
  --keys <path>               Release key profile (default: $_defaultKeysFile).
''';

void main(List<String> arguments) {
  if (arguments.isEmpty ||
      arguments.contains('--help') ||
      arguments.contains('-h')) {
    stdout.write(_usage);
    return;
  }
  try {
    final options = _parseOptions(arguments);
    final platform = options['platform'] ?? '';
    if (platform != 'linux' && platform != 'windows') {
      throw const HelperPolicyException(
        '--platform is required and must be linux or windows.',
      );
    }
    final appId = options['app-id'] ?? '';
    if (appId.isEmpty) {
      throw const HelperPolicyException('--app-id is required.');
    }
    final bundle = Directory(options['bundle'] ?? _defaultBundle(platform));
    if (!bundle.existsSync()) {
      throw HelperPolicyException('Bundle not found: ${bundle.path}');
    }
    final appBinary = File(
      options['app-binary'] ??
          _join([bundle.path, _defaultAppBinary(platform)]),
    );
    if (!appBinary.existsSync()) {
      throw HelperPolicyException('App binary not found: ${appBinary.path}');
    }
    final helper = File(
      options['helper'] ?? _locateHelper(platform, bundle.path),
    );
    final keysFile = File(options['keys'] ?? _defaultKeysFile);
    if (!keysFile.existsSync()) {
      throw HelperPolicyException(
        'Release key profile not found: ${keysFile.path}',
      );
    }

    final canonical = buildPortableHelperPolicyJson(
      applicationPackageId: appId,
      applicationSha256: _sha256File(appBinary),
      helperSha256: _sha256File(helper),
      releasePublicKeys: _readReleasePublicKeys(keysFile),
    );
    // Fails closed if the generated JSON is not the canonical contract.
    final validated = validateHelperPolicyJson(
      canonical,
      expectedApplicationPackageId: appId,
      minimumAcceptedPolicyVersion: 1,
    );

    final destination = File(
      _join([helper.parent.path, helperPolicyFileNameFor(platform)]),
    );
    destination.writeAsStringSync(validated.canonicalJson);
    stdout.writeln('Wrote ${destination.path}');
    stdout.writeln('Policy SHA-256: ${validated.canonicalSha256}');
  } on HelperPolicyException catch (error) {
    stderr.writeln('❌ ${error.message}');
    exitCode = 1;
  } on FileSystemException catch (error) {
    stderr.writeln('❌ ${error.message}: ${error.path}');
    exitCode = 1;
  }
}

Map<String, String> _parseOptions(List<String> arguments) {
  const known = {
    'platform',
    'app-id',
    'bundle',
    'app-binary',
    'helper',
    'keys',
  };
  final options = <String, String>{};
  for (var index = 0; index < arguments.length; index++) {
    final argument = arguments[index];
    if (!argument.startsWith('--')) {
      throw HelperPolicyException('Unexpected argument: $argument');
    }
    final separator = argument.indexOf('=');
    final String name;
    final String value;
    if (separator != -1) {
      name = argument.substring(2, separator);
      value = argument.substring(separator + 1);
    } else {
      name = argument.substring(2);
      if (index + 1 >= arguments.length) {
        throw HelperPolicyException('Missing value for --$name');
      }
      value = arguments[++index];
    }
    if (!known.contains(name)) {
      throw HelperPolicyException('Unknown option: --$name');
    }
    options[name] = value;
  }
  return options;
}

String _defaultBundle(String platform) => switch (platform) {
  'linux' => _join(['build', 'linux', 'x64', 'release', 'bundle']),
  _ => _join(['build', 'windows', 'x64', 'runner', 'Release']),
};

String _defaultAppBinary(String platform) =>
    platform == 'windows' ? 'novyse.exe' : 'novyse';

String _locateHelper(String platform, String bundlePath) {
  final candidates = platform == 'windows'
      ? [
          _join([bundlePath, 'desktop_updater_install_helper.exe']),
        ]
      : [
          _join([bundlePath, 'lib', 'desktop-updater-helper']),
          _join([bundlePath, 'desktop-updater-helper']),
          _join([bundlePath, 'libexec', 'desktop-updater-helper']),
        ];
  for (final candidate in candidates) {
    if (File(candidate).existsSync()) return candidate;
  }
  final names = candidates.map((path) => path.split('/').last).join(', ');
  throw HelperPolicyException(
    'Install helper not found in $bundlePath (looked for $names).',
  );
}

Map<String, String> _readReleasePublicKeys(File keysFile) {
  final decoded = jsonDecode(keysFile.readAsStringSync());
  if (decoded is! Map<String, dynamic>) {
    throw HelperPolicyException(
      'Release key profile must be a JSON object: ${keysFile.path}',
    );
  }
  final keys = decoded['publicKeys'];
  if (keys is! Map<String, dynamic> || keys.isEmpty) {
    throw HelperPolicyException(
      'Release key profile has no publicKeys: ${keysFile.path}',
    );
  }
  final result = <String, String>{};
  for (final entry in keys.entries) {
    final value = entry.value;
    if (value is! String) {
      throw HelperPolicyException('Public key ${entry.key} is not a string.');
    }
    result[entry.key] = value;
  }
  return result;
}

String _sha256File(File file) =>
    sha256.convert(file.readAsBytesSync()).toString();

String _join(List<String> parts) =>
    parts.where((part) => part.isNotEmpty).join(Platform.pathSeparator);
