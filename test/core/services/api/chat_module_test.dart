import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/services/api/modules/chat_module.dart';

import '../../../helpers/fake_http.dart';

void main() {
  group('ChatModule', () {
    group('create', () {
      test('POSTs the type and members, omitting a null name', () async {
        final http = FakeHttp.always({
          'chat': {'uuid': 'chat-1'},
          'users': [
            {'uuid': 'u1'},
          ],
        });

        final res = await ChatModule(http.dio)
            .create('GROUP', memberUUIDs: ['u1', 'u2'], name: 'Squad');

        expect(http.only.method, 'POST');
        expect(http.only.path, '/chat/create');
        expect(http.only.json, {
          'type': 'GROUP',
          'memberUUIDs': ['u1', 'u2'],
          'name': 'Squad',
        });
        expect(res, {
          'success': true,
          'chat': {'uuid': 'chat-1'},
          'users': [
            {'uuid': 'u1'},
          ],
        });
      });

      test('sends an empty memberUUIDs list by default', () async {
        final http = FakeHttp.always({'chat': {}, 'users': []});

        await ChatModule(http.dio).create('GROUP', name: 'Empty');

        expect(http.only.json['memberUUIDs'], isEmpty);
        expect(http.only.json.containsKey('handle'), isFalse);
      });

      test('omits an empty handle but keeps a null name out too', () async {
        final http = FakeHttp.always({'chat': {}, 'users': []});

        await ChatModule(http.dio).create('GROUP', handle: '');

        expect(http.only.json.containsKey('handle'), isFalse);
        expect(http.only.json.containsKey('name'), isFalse);
      });

      test('sends a non-empty handle', () async {
        final http = FakeHttp.always({'chat': {}, 'users': []});

        await ChatModule(http.dio).create('GROUP', handle: 'invite-code');

        expect(http.only.json['handle'], 'invite-code');
      });

      test('rejects an empty type', () {
        expect(
          () => ChatModule(FakeHttp.always(null).dio).create(''),
          throwsAssertionError,
        );
      });

      test('requires exactly one member for a DM', () {
        final module = ChatModule(FakeHttp.always(null).dio);
        expect(
          () => module.create('DM', memberUUIDs: ['u1', 'u2']),
          throwsAssertionError,
        );
        expect(() => module.create('DM'), throwsAssertionError);
      });

      test('accepts a DM with a single member', () async {
        final http = FakeHttp.always({'chat': {}, 'users': []});

        final res = await ChatModule(http.dio)
            .create('DM', memberUUIDs: ['u1']);

        expect(res['success'], isTrue);
      });

      test('returns only success=false when the envelope fails', () async {
        final res = await ChatModule(FakeHttp.failure().dio)
            .create('GROUP', name: 'x');

        expect(res, {'success': false});
      });
    });

    group('join', () {
      test('POSTs the handle and projects the chat and users', () async {
        final http = FakeHttp.always({
          'chat': {'uuid': 'chat-9'},
          'users': [
            {'uuid': 'me'},
          ],
        });

        final res = await ChatModule(http.dio).join('handle-1');

        expect(http.only.path, '/chat/join');
        expect(http.only.json, {'handle': 'handle-1'});
        expect(res['success'], isTrue);
        expect(res['chat'], {'uuid': 'chat-9'});
      });

      test('rejects an empty handle', () {
        expect(
          () => ChatModule(FakeHttp.always(null).dio).join(''),
          throwsAssertionError,
        );
      });

      test('returns only success=false when the envelope fails', () async {
        final res = await ChatModule(FakeHttp.failure().dio).join('nope');

        expect(res, {'success': false});
      });
    });

    group('rename', () {
      test('PATCHes the new name and returns the event id', () async {
        final http = FakeHttp.always({'name': 'New', 'chatEventID': 3});

        final res = await ChatModule(http.dio).rename('chat-1', 'New');

        expect(http.only.method, 'PATCH');
        expect(http.only.path, '/chat/rename');
        expect(http.only.json, {'chatUUID': 'chat-1', 'name': 'New'});
        expect(res.success, isTrue);
        expect(res.name, 'New');
        expect(res.chatEventID, 3);
      });

      test('rejects an empty chatUUID or name', () {
        final module = ChatModule(FakeHttp.always(null).dio);
        expect(() => module.rename('', 'n'), throwsAssertionError);
        expect(() => module.rename('c', ''), throwsAssertionError);
      });

      test('reports failure when the envelope is not successful', () async {
        final res = await ChatModule(FakeHttp.failure().dio)
            .rename('chat-1', 'New');

        expect(res.success, isFalse);
        expect(res.name, isNull);
        expect(res.chatEventID, isNull);
      });
    });
  });

  group('ChatPictureModule', () {
    test(
      'requestUpload PATCHes the metadata and returns the upload URL',
      () async {
        final http = FakeHttp.always({
          'fileUUID': 'file-1',
          'uploadURL': 'https://s3.test/put',
          'expiresAt': '2026-01-01T00:00:00Z',
        });

        final res = await ChatModule(http.dio).picture
            .requestUpload('chat-1', 'avatar.png', 'image/png', 2048);

        expect(http.only.method, 'PATCH');
        expect(http.only.path, '/chat/picture');
        expect(http.only.json, {
          'chatUUID': 'chat-1',
          'name': 'avatar.png',
          'mimeType': 'image/png',
          'size': 2048,
        });
        expect(res.success, isTrue);
        expect(res.fileUUID, 'file-1');
        expect(res.uploadURL, 'https://s3.test/put');
        expect(res.expiresAt, '2026-01-01T00:00:00Z');
      },
    );

    test(
      'requestUpload reports failure when the envelope is not successful',
      () async {
        final res = await ChatModule(FakeHttp.failure().dio).picture
            .requestUpload('chat-1', 'a.png', 'image/png', 1);

        expect(res.success, isFalse);
        expect(res.fileUUID, isNull);
        expect(res.uploadURL, isNull);
        expect(res.expiresAt, isNull);
      },
    );

    test('confirm POSTs the fileUUID and returns the picture uuid', () async {
      final http = FakeHttp.always({'pictureUUID': 'pic-1', 'chatEventID': 11});

      final res = await ChatModule(http.dio).picture
          .confirm('chat-1', 'file-1');

      expect(http.only.path, '/chat/picture/confirm');
      expect(http.only.json, {'chatUUID': 'chat-1', 'fileUUID': 'file-1'});
      expect(res.success, isTrue);
      expect(res.pictureUUID, 'pic-1');
      expect(res.chatEventID, 11);
    });

    test(
      'confirm reports failure when the envelope is not successful',
      () async {
        final res = await ChatModule(FakeHttp.failure().dio).picture
            .confirm('chat-1', 'file-1');

        expect(res.success, isFalse);
        expect(res.pictureUUID, isNull);
      },
    );
  });

  group('ChatPinModule', () {
    test('add PUTs the position and decodes the response', () async {
      final http = FakeHttp.always({'position': 0, 'userEventID': 5});

      final res = await ChatModule(http.dio).pin.add('chat-1', 0);

      expect(http.only.method, 'PUT');
      expect(http.only.path, '/chat/pin');
      expect(http.only.json, {'chatUUID': 'chat-1', 'position': 0});
      expect(res.success, isTrue);
      expect(res.position, 0);
      expect(res.userEventID, 5);
    });

    test('remove DELETEs the pin and returns the event id', () async {
      final http = FakeHttp.always({'userEventID': 6});

      final res = await ChatModule(http.dio).pin.remove('chat-1');

      expect(http.only.method, 'DELETE');
      expect(http.only.path, '/chat/pin');
      expect(http.only.json, {'chatUUID': 'chat-1'});
      expect(res.success, isTrue);
      expect(res.userEventID, 6);
    });

    test(
      'remove reports failure when the envelope is not successful',
      () async {
        final res = await ChatModule(FakeHttp.failure().dio).pin
            .remove('chat-1');

        expect(res.success, isFalse);
        expect(res.userEventID, isNull);
      },
    );
  });

  group('ChatSubModule', () {
    test('create POSTs the sub metadata and returns the sub map', () async {
      final http = FakeHttp.always({'id': 1, 'name': 'General'});

      final res = await ChatModule(http.dio).sub
          .create('chat-1', 'General', 'TEXT');

      expect(http.only.path, '/chat/sub/create');
      expect(http.only.json, {
        'chatUUID': 'chat-1',
        'name': 'General',
        'type': 'TEXT',
      });
      expect(res.success, isTrue);
      expect(res.sub, {'id': 1, 'name': 'General'});
    });

    test(
      'create reports failure when the envelope is not successful',
      () async {
        final res = await ChatModule(FakeHttp.failure().dio).sub
            .create('chat-1', 'General', 'TEXT');

        expect(res.success, isFalse);
        expect(res.sub, isNull);
      },
    );

    test('rename PATCHes and returns whether it succeeded', () async {
      final ok = FakeHttp.always(null);
      expect(
        await ChatModule(ok.dio).sub.rename('chat-1', 2, 'Renamed'),
        isTrue,
      );
      expect(ok.only.method, 'PATCH');
      expect(ok.only.path, '/chat/sub/rename');
      expect(ok.only.json, {'chatUUID': 'chat-1', 'id': 2, 'name': 'Renamed'});

      final bad = FakeHttp.failure();
      expect(
        await ChatModule(bad.dio).sub.rename('chat-1', 2, 'Renamed'),
        isFalse,
      );
    });

    test('delete DELETEs and returns whether it succeeded', () async {
      final ok = FakeHttp.always(null);
      expect(await ChatModule(ok.dio).sub.delete('chat-1', 2), isTrue);
      expect(ok.only.method, 'DELETE');
      expect(ok.only.path, '/chat/sub/delete');
      expect(ok.only.json, {'chatUUID': 'chat-1', 'id': 2});

      final bad = FakeHttp.failure();
      expect(await ChatModule(bad.dio).sub.delete('chat-1', 2), isFalse);
    });
  });
}
