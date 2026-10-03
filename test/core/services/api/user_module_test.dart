import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/services/api/modules/user_module.dart';

import '../../../helpers/fake_http.dart';

void main() {
  group('UserModule', () {
    group('initialize', () {
      test('GETs /user/initialize and projects the known keys', () async {
        final http = FakeHttp.always({
          'local': {'uuid': 'me'},
          'users': [
            {'uuid': 'u1'},
          ],
          'chats': [
            {'uuid': 'c1'},
          ],
          'messages': [
            {'id': 1},
          ],
          'unexpectedServerKey': 'dropped',
        });

        final res = await UserModule(http.dio).initialize();

        expect(http.only.method, 'GET');
        expect(http.only.path, '/user/initialize');
        expect(res, {
          'success': true,
          'local': {'uuid': 'me'},
          'users': [
            {'uuid': 'u1'},
          ],
          'chats': [
            {'uuid': 'c1'},
          ],
          'messages': [
            {'id': 1},
          ],
        });
      });

      test('returns only success=false when the envelope fails', () async {
        final res = await UserModule(FakeHttp.failure().dio).initialize();

        expect(res, {'success': false});
      });
    });

    group('update', () {
      test('POSTs the sync payload and projects the response', () async {
        final http = FakeHttp.always({
          'local': {'uuid': 'me'},
          'users': [
            {'uuid': 'u1'},
          ],
          'chats': [
            {'uuid': 'c1'},
          ],
          'messages': <dynamic>[],
        });

        final res = await UserModule(http.dio).update(
          {'uuid': 'me'},
          [
            {'uuid': 'c1'},
          ],
          [
            {'uuid': 'u1'},
          ],
        );

        expect(http.only.method, 'POST');
        expect(http.only.path, '/user/update');
        expect(http.only.json, {
          'local': {'uuid': 'me'},
          'chats': [
            {'uuid': 'c1'},
          ],
          'users': [
            {'uuid': 'u1'},
          ],
        });
        expect(res['success'], isTrue);
        expect(res['chats'], [
          {'uuid': 'c1'},
        ]);
      });

      test('returns only success=false when the envelope fails', () async {
        final res = await UserModule(FakeHttp.failure().dio).update({}, [], []);

        expect(res, {'success': false});
      });
    });

    group('presence', () {
      test('short-circuits without a request when the list is empty', () async {
        final http = FakeHttp.always(<dynamic>[]);

        final res = await UserModule(http.dio).presence(const []);

        expect(res.success, isTrue);
        expect(res.data, isNull);
        expect(http.requests, isEmpty);
      });

      test('POSTs the uuids and returns the raw payload', () async {
        final http = FakeHttp.always([
          {'uuid': 'u1', 'status': 'ONLINE'},
        ]);

        final res = await UserModule(http.dio).presence(['u1', 'u2']);

        expect(http.only.path, '/user/presence');
        expect(http.only.json, {
          'userUUIDs': ['u1', 'u2'],
        });
        expect(res.success, isTrue);
        expect(res.data, [
          {'uuid': 'u1', 'status': 'ONLINE'},
        ]);
      });

      test('reports failure when the envelope is not successful', () async {
        final res = await UserModule(FakeHttp.failure().dio).presence(['u1']);

        expect(res.success, isFalse);
        expect(res.data, isNull);
      });
    });
  });

  group('UserSettingsModule', () {
    test('PUTs the key and value to the preferences endpoint', () async {
      final http = FakeHttp.always({'userEventID': 4});

      final res = await UserModule(http.dio).settings
          .updateSetting('theme', 'dark');

      expect(http.only.method, 'PUT');
      expect(http.only.path, '/user/settings/preferences');
      expect(http.only.json, {'key': 'theme', 'value': 'dark'});
      expect(res.success, isTrue);
      expect(res.userEventID, 4);
    });

    test('allows a null value, for resetting a preference', () async {
      final http = FakeHttp.always({'userEventID': 5});

      await UserModule(http.dio).settings.updateSetting('theme', null);

      expect(http.only.json.containsKey('value'), isTrue);
      expect(http.only.json['value'], isNull);
    });

    test('coerces a double userEventID to an int', () async {
      final res = await UserModule(FakeHttp.always({'userEventID': 7.0}).dio)
          .settings
          .updateSetting('theme', 'dark');

      expect(res.userEventID, 7);
      expect(res.userEventID, isA<int>());
    });

    test('succeeds with a null event id when the field is absent', () async {
      final res = await UserModule(FakeHttp.always(<String, dynamic>{}).dio)
          .settings
          .updateSetting('theme', 'dark');

      expect(res.success, isTrue);
      expect(res.userEventID, isNull);
    });

    test('reports failure when the envelope is not successful', () async {
      final res = await UserModule(FakeHttp.failure().dio).settings
          .updateSetting('theme', 'dark');

      expect(res.success, isFalse);
      expect(res.userEventID, isNull);
    });

    test('swallows transport errors instead of throwing', () async {
      final res = await UserModule(FakeHttp.offline().dio).settings
          .updateSetting('theme', 'dark');

      expect(res.success, isFalse);
      expect(res.userEventID, isNull);
    });
  });

  group('UserProfilePictureModule', () {
    test('update PATCHes the metadata and returns the upload URL', () async {
      final http = FakeHttp.always({
        'fileUUID': 'file-1',
        'uploadURL': 'https://s3.test/put',
        'expiresAt': '2026-01-01T00:00:00Z',
      });

      final res = await UserModule(http.dio).profile.picture
          .update('me.png', 'image/png', 1024);

      expect(http.only.method, 'PATCH');
      expect(http.only.path, '/user/profile/picture');
      expect(http.only.json, {
        'name': 'me.png',
        'mimeType': 'image/png',
        'size': 1024,
      });
      expect(res.success, isTrue);
      expect(res.fileUUID, 'file-1');
      expect(res.uploadURL, 'https://s3.test/put');
      expect(res.expiresAt, '2026-01-01T00:00:00Z');
    });

    test(
      'update reports failure when the envelope is not successful',
      () async {
        final res = await UserModule(FakeHttp.failure().dio).profile.picture
            .update('me.png', 'image/png', 1);

        expect(res.success, isFalse);
        expect(res.fileUUID, isNull);
      },
    );

    test('confirm POSTs the fileUUID and returns the picture uuid', () async {
      final http = FakeHttp.always({
        'profilePictureUUID': 'pic-1',
        'profileEventID': 8,
      });

      final res = await UserModule(http.dio).profile.picture.confirm('file-1');

      expect(http.only.path, '/user/profile/picture/confirm');
      expect(http.only.json, {'fileUUID': 'file-1'});
      expect(res.success, isTrue);
      expect(res.profilePictureUUID, 'pic-1');
      expect(res.profileEventID, 8);
    });

    test(
      'confirm reports failure when the envelope is not successful',
      () async {
        final res = await UserModule(FakeHttp.failure().dio).profile.picture
            .confirm('file-1');

        expect(res.success, isFalse);
        expect(res.profilePictureUUID, isNull);
        expect(res.profileEventID, isNull);
      },
    );
  });

  group('UserProfileUpdateModule', () {
    test('all PATCHes the three fields and returns the event id', () async {
      final http = FakeHttp.always({'profileEventID': 12});

      final res = await UserModule(http.dio).profile.updateInfo
          .all(name: 'Ada', surname: 'Lovelace', biography: 'Math');

      expect(http.only.method, 'PATCH');
      expect(http.only.path, '/user/profile');
      expect(http.only.json, {
        'name': 'Ada',
        'surname': 'Lovelace',
        'biography': 'Math',
      });
      expect(res.success, isTrue);
      expect(res.profileEventID, 12);
    });

    test('all sends empty strings when the fields are omitted', () async {
      final http = FakeHttp.always({'profileEventID': 1});

      await UserModule(http.dio).profile.updateInfo.all();

      expect(http.only.json, {'name': '', 'surname': '', 'biography': ''});
    });

    test('all reports failure when the envelope is not successful', () async {
      final res = await UserModule(FakeHttp.failure().dio).profile.updateInfo
          .all(name: 'a');

      expect(res.success, isFalse);
      expect(res.profileEventID, isNull);
    });

    test(
      'the deprecated updateAll forwards to all with the same args',
      () async {
        final http = FakeHttp.always({'profileEventID': 13});
        final module = UserModule(http.dio);

        // ignore: deprecated_member_use_from_same_package
        final res = await module.profile.updateAll(
          name: 'Grace',
          surname: 'Hopper',
          biography: 'COBOL',
        );

        expect(res.success, isTrue);
        expect(res.profileEventID, 13);
        expect(http.only.json, {
          'name': 'Grace',
          'surname': 'Hopper',
          'biography': 'COBOL',
        });
      },
    );
  });

  group('UserProfileBadgesModule', () {
    test('get GETs the badges with the userUUID query parameter', () async {
      final http = FakeHttp.always([
        {'id': 'verified'},
      ]);

      final res = await UserModule(http.dio).profile.badges.get('u1');

      expect(http.only.method, 'GET');
      expect(http.only.path, '/user/profile/badges');
      expect(http.only.query, {'userUUID': 'u1'});
      expect(res.success, isTrue);
      expect(res.badges, [
        {'id': 'verified'},
      ]);
    });

    test('get reports failure when the envelope is not successful', () async {
      final res = await UserModule(FakeHttp.failure().dio).profile.badges
          .get('u1');

      expect(res.success, isFalse);
      expect(res.badges, isNull);
    });
  });

  group('UserProfileGetModule', () {
    test('byHandle GETs the user and marks the request as skipAuth', () async {
      final http = FakeHttp.always({'uuid': 'u1', 'handle': 'ada'});

      final res = await UserModule(http.dio).profile.get.byHandle('ada');

      expect(http.only.method, 'GET');
      expect(http.only.path, '/user/profile/handle');
      expect(http.only.query, {'handle': 'ada'});
      expect(res.success, isTrue);
      expect(res.user, {'uuid': 'u1', 'handle': 'ada'});
    });

    test('byHandle opts out of the auth interceptor', () async {
      final http = FakeHttp.always(<String, dynamic>{});

      await UserModule(http.dio).profile.get.byHandle('ada');

      expect(http.only.options.extra['skipAuth'], isTrue);
    });

    test('reports failure when the envelope is not successful', () async {
      final res = await UserModule(FakeHttp.failure().dio).profile.get
          .byHandle('nobody');

      expect(res.success, isFalse);
      expect(res.user, isNull);
    });
  });
}
