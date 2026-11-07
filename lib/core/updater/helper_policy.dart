library;

import 'dart:collection';
import 'dart:convert';

/// Name the Linux helper reads next to `desktop-updater-helper`.
const String linuxHelperPolicyFileName = 'desktop-updater-helper.policy.json';

/// Name the Windows helper reads next to `desktop_updater_install_helper.exe`.
const String windowsHelperPolicyFileName = 'desktop_updater_helper_policy.json';

const int _policyVersion = 1;

final RegExp _sha256Pattern = RegExp(r'^[0-9a-f]{64}$');
final RegExp _identifierPattern = RegExp(
  r'^[A-Za-z0-9](?:[A-Za-z0-9._-]{1,126}[A-Za-z0-9])?$',
);

/// Returns the policy file name the helper of [platform] expects.
String helperPolicyFileNameFor(String platform) => switch (platform) {
  'linux' => linuxHelperPolicyFileName,
  'windows' => windowsHelperPolicyFileName,
  _ => throw HelperPolicyException('Unsupported platform: $platform'),
};

/// Thrown when the policy inputs cannot produce a policy the helper accepts.
class HelperPolicyException implements Exception {
  const HelperPolicyException(this.message);

  final String message;

  @override
  String toString() => 'HelperPolicyException: $message';
}

/// Builds the canonical portable helper policy for a released bundle.
///
/// Both Linux and Windows helpers reject installs unless this JSON sits next
/// to the install helper. The policy pins the exact application executable and
/// helper digests, so it must be generated after `flutter build` and shipped
/// inside the bundle. Portable installs are same-user only: no install roots
/// are granted, hence no elevation.
String buildPortableHelperPolicyJson({
  required String applicationPackageId,
  required String applicationSha256,
  required String helperSha256,
  required Map<String, String> releasePublicKeys,
}) {
  _requireIdentifier(applicationPackageId, 'applicationPackageId');
  _requireSha256(applicationSha256, 'applicationSha256');
  _requireSha256(helperSha256, 'helperSha256');
  if (releasePublicKeys.isEmpty) {
    throw const HelperPolicyException(
      'At least one release public key is required.',
    );
  }
  for (final entry in releasePublicKeys.entries) {
    _requireIdentifier(entry.key, 'releasePublicKeys key id');
    if (entry.value.isEmpty) {
      throw HelperPolicyException('Release public key ${entry.key} is empty.');
    }
  }

  final helperServiceId = '$applicationPackageId.helper';
  return canonicalHelperPolicyJson({
    'policyVersion': _policyVersion,
    'policyId': '$applicationPackageId.install-policy',
    'applicationPackageId': applicationPackageId,
    'helperServiceId': helperServiceId,
    'allowedApplicationSigner': {'kind': 'sha256', 'value': applicationSha256},
    'allowedHelperSigner': {'kind': 'sha256', 'value': helperSha256},
    'allowedTargetClasses': const ['sameUserWritable'],
    'allowedInstallRoots': const <String>[],
    'releaseRootPublicKeys': [
      for (final entry in releasePublicKeys.entries)
        {
          'keyId': entry.key,
          'algorithm': 'ed25519',
          'publicKeyBase64': entry.value,
        },
    ],
    'allowedStrategies': const [
      {'strategy': 'directoryReplace', 'provider': 'platformDirectory'},
    ],
    'minimumHelperProtocolVersion': 1,
  });
}

/// Encodes [value] as the canonical JSON the helpers compare byte by byte.
///
/// Keys are sorted by UTF-8 bytes at every level and no whitespace is emitted.
String canonicalHelperPolicyJson(Object? value) => jsonEncode(_sortJson(value));

Object? _sortJson(Object? value) {
  if (value is Map) {
    final sorted = SplayTreeMap<String, Object?>(_compareUtf8);
    for (final entry in value.entries) {
      final key = entry.key;
      if (key is! String) {
        throw const HelperPolicyException('Object keys must be strings.');
      }
      sorted[key] = _sortJson(entry.value);
    }
    return sorted;
  }
  if (value is List) return value.map(_sortJson).toList();
  if (value == null || value is bool || value is num || value is String) {
    return value;
  }
  throw HelperPolicyException(
    'Unsupported value in policy: ${value.runtimeType}.',
  );
}

int _compareUtf8(String left, String right) {
  final leftBytes = utf8.encode(left);
  final rightBytes = utf8.encode(right);
  final shared = leftBytes.length < rightBytes.length
      ? leftBytes.length
      : rightBytes.length;
  for (var index = 0; index < shared; index++) {
    final comparison = leftBytes[index].compareTo(rightBytes[index]);
    if (comparison != 0) return comparison;
  }
  return leftBytes.length.compareTo(rightBytes.length);
}

void _requireSha256(String value, String field) {
  if (!_sha256Pattern.hasMatch(value)) {
    throw HelperPolicyException(
      '$field must be a lowercase SHA-256 hex digest.',
    );
  }
}

void _requireIdentifier(String value, String field) {
  if (!_identifierPattern.hasMatch(value)) {
    throw HelperPolicyException('$field is not a valid identifier: $value');
  }
}
