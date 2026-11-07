import 'dart:convert';

// The native helper validates the policy with this exact implementation, so the
// test uses it as the reference for byte equality.
// ignore: implementation_imports
import 'package:desktop_updater/src/native_install_helper/policy.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/updater/helper_policy.dart';

const _appSha =
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const _helperSha =
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const _keys = {
  'release-689c861f78cd1ea3dddb5d84':
      'qqLWN1e+CheqM0NUbV3/593VffzmWQKUbD6ROFXpiK0=',
};

String _policy() => buildPortableHelperPolicyJson(
  applicationPackageId: 'com.novyse',
  applicationSha256: _appSha,
  helperSha256: _helperSha,
  releasePublicKeys: _keys,
);

void main() {
  group('buildPortableHelperPolicyJson', () {
    test('matches the canonical contract the helper enforces', () {
      final canonical = _policy();
      final validated = validateHelperPolicyJson(
        canonical,
        expectedApplicationPackageId: 'com.novyse',
        minimumAcceptedPolicyVersion: 1,
      );

      expect(validated.canonicalJson, canonical);
      expect(canonical, isNot(contains('\n')));
      expect(canonical, isNot(contains(': ')));
    });

    test('describes a portable same-user install', () {
      final decoded = jsonDecode(_policy()) as Map<String, dynamic>;

      expect(decoded['policyVersion'], 1);
      expect(decoded['policyId'], 'com.novyse.install-policy');
      expect(decoded['applicationPackageId'], 'com.novyse');
      expect(decoded['helperServiceId'], 'com.novyse.helper');
      expect(decoded['allowedApplicationSigner'], {
        'kind': 'sha256',
        'value': _appSha,
      });
      expect(decoded['allowedHelperSigner'], {
        'kind': 'sha256',
        'value': _helperSha,
      });
      expect(decoded['allowedTargetClasses'], ['sameUserWritable']);
      expect(decoded['allowedInstallRoots'], isEmpty);
      expect(decoded['allowedStrategies'], [
        {'strategy': 'directoryReplace', 'provider': 'platformDirectory'},
      ]);
      expect(decoded['minimumHelperProtocolVersion'], 1);
      expect(decoded['releaseRootPublicKeys'], [
        {
          'keyId': 'release-689c861f78cd1ea3dddb5d84',
          'algorithm': 'ed25519',
          'publicKeyBase64': 'qqLWN1e+CheqM0NUbV3/593VffzmWQKUbD6ROFXpiK0=',
        },
      ]);
    });

    test('sorts keys by UTF-8 at every level', () {
      expect(
        canonicalHelperPolicyJson({
          'b': 1,
          'a': {'d': 2, 'c': 3},
        }),
        '{"a":{"c":3,"d":2},"b":1}',
      );
    });

    test('rejects digests and identifiers the helper would refuse', () {
      expect(
        () => buildPortableHelperPolicyJson(
          applicationPackageId: 'com.novyse',
          applicationSha256: 'not-a-digest',
          helperSha256: _helperSha,
          releasePublicKeys: _keys,
        ),
        throwsA(isA<HelperPolicyException>()),
      );
      expect(
        () => buildPortableHelperPolicyJson(
          applicationPackageId: 'com/novyse',
          applicationSha256: _appSha,
          helperSha256: _helperSha,
          releasePublicKeys: _keys,
        ),
        throwsA(isA<HelperPolicyException>()),
      );
      expect(
        () => buildPortableHelperPolicyJson(
          applicationPackageId: 'com.novyse',
          applicationSha256: _appSha,
          helperSha256: _helperSha,
          releasePublicKeys: const {},
        ),
        throwsA(isA<HelperPolicyException>()),
      );
    });
  });

  test('names the policy file each platform helper reads', () {
    expect(
      helperPolicyFileNameFor('linux'),
      'desktop-updater-helper.policy.json',
    );
    expect(
      helperPolicyFileNameFor('windows'),
      'desktop_updater_helper_policy.json',
    );
    expect(
      () => helperPolicyFileNameFor('macos'),
      throwsA(isA<HelperPolicyException>()),
    );
  });
}
