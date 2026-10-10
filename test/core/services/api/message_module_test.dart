import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/services/api/modules/message_module.dart';

import '../../../helpers/fake_http.dart';

void main() {
  group('MessageModule', () {
    group('retrieve', () {
      test('GETs /message with the identifiers as query parameters', () async {
        final http = FakeHttp.always({'id': 12, 'content': 'hi'});
        final module = MessageModule(http.dio);

        final res = await module.retrieve('chat-1', 4, 'msg-9');

        expect(http.only.method, 'GET');
        expect(http.only.path, '/message');
        expect(http.only.query, {
          'chatUUID': 'chat-1',
          'subID': 4,
          'messageID': 'msg-9',
        });
        expect(res.success, isTrue);
        expect(res.message, {'id': 12, 'content': 'hi'});
      });

      test('reports failure when the envelope is not successful', () async {
        final res = await MessageModule(FakeHttp.failure().dio)
            .retrieve('chat-1', 0, 'msg-1');

        expect(res.success, isFalse);
        expect(res.message, isNull);
      });
    });

    group('send', () {
      test('POSTs /message and omits the optional fields when unset', () async {
        final http = FakeHttp.always({'id': 1});
        final module = MessageModule(http.dio);

        final res = await module.send('chat-1', content: 'hello');

        expect(http.only.method, 'POST');
        expect(http.only.path, '/message');
        expect(http.only.body, {
          'chatUUID': 'chat-1',
          'subID': 0,
          'content': 'hello',
          'type': 'message',
        });
        expect(res.success, isTrue);
        expect(res.message, {'id': 1});
      });

      test('includes files and replyTos when provided', () async {
        final http = FakeHttp.always({'id': 1});
        final module = MessageModule(http.dio);

        await module.send(
          'chat-1',
          subID: 2,
          type: 'message',
          content: 'look',
          files: [
            {'uuid': 'f1'},
          ],
          replyTos: [
            {'id': 5},
          ],
        );

        expect(http.only.body, {
          'chatUUID': 'chat-1',
          'subID': 2,
          'content': 'look',
          'type': 'message',
          'files': [
            {'uuid': 'f1'},
          ],
          'replyTos': [
            {'id': 5},
          ],
        });
      });

      test('omits content entirely when it is null', () async {
        final http = FakeHttp.always({'id': 1});

        await MessageModule(http.dio).send(
          'chat-1',
          type: 'image',
          files: [
            {'uuid': 'f1'},
          ],
        );

        expect(http.only.json.containsKey('content'), isFalse);
        expect(http.only.json['type'], 'image');
      });

      test('reports failure when the envelope is not successful', () async {
        final res = await MessageModule(FakeHttp.failure().dio)
            .send('chat-1', content: 'x');

        expect(res.success, isFalse);
        expect(res.message, isNull);
      });
    });

    group('confirm', () {
      test('POSTs the messageUUID to /message/confirm', () async {
        final http = FakeHttp.always({'id': 3, 'at': 'now'});

        final res = await MessageModule(http.dio).confirm('msg-3');

        expect(http.only.path, '/message/confirm');
        expect(http.only.method, 'POST');
        expect(http.only.body, {'messageUUID': 'msg-3'});
        expect(res.success, isTrue);
        expect(res.message, {'id': 3, 'at': 'now'});
      });

      test('reports failure when the envelope is not successful', () async {
        final res = await MessageModule(FakeHttp.failure().dio)
            .confirm('msg-3');

        expect(res.success, isFalse);
        expect(res.message, isNull);
      });
    });

    group('delete', () {
      test('DELETEs /message and returns the chatEventID', () async {
        final http = FakeHttp.always({'chatEventID': 77});

        final res = await MessageModule(http.dio).delete('chat-1', 3, 'msg-2');

        expect(http.only.method, 'DELETE');
        expect(http.only.path, '/message');
        expect(http.only.body, {
          'chatUUID': 'chat-1',
          'subID': 3,
          'messageID': 'msg-2',
        });
        expect(res.success, isTrue);
        expect(res.chatEventID, 77);
      });

      test(
        'succeeds with a null chatEventID when the field is absent',
        () async {
          final res = await MessageModule(
            FakeHttp.always(<String, dynamic>{}).dio,
          ).delete('chat-1', 0, 'msg-2');

          expect(res.success, isTrue);
          expect(res.chatEventID, isNull);
        },
      );

      test('reports failure when the envelope is not successful', () async {
        final res = await MessageModule(FakeHttp.failure().dio)
            .delete('chat-1', 0, 'msg-2');

        expect(res.success, isFalse);
        expect(res.chatEventID, isNull);
      });
    });

    group('edit', () {
      test(
        'PATCHes /message and returns the event id with the raw data',
        () async {
          final http = FakeHttp.always({
            'chatEventID': 9,
            'files': [
              {'uploadURL': 'https://s3'},
            ],
          });

          final res = await MessageModule(http.dio).edit(
            'chat-1',
            1,
            'msg-1',
            'updated',
            files: [
              {'name': 'a.png'},
            ],
          );

          expect(http.only.method, 'PATCH');
          expect(http.only.path, '/message');
          expect(http.only.body, {
            'chatUUID': 'chat-1',
            'subID': 1,
            'messageID': 'msg-1',
            'content': 'updated',
            'files': [
              {'name': 'a.png'},
            ],
          });
          expect(res.success, isTrue);
          expect(res.chatEventID, 9);
          expect(res.data, {
            'chatEventID': 9,
            'files': [
              {'uploadURL': 'https://s3'},
            ],
          });
        },
      );

      test(
        'sends a null content when editing without changing the text',
        () async {
          final http = FakeHttp.always({'chatEventID': 1});

          await MessageModule(http.dio).edit('chat-1', 0, 'msg-1', null);

          expect(http.last.json['content'], isNull);
          expect(http.last.json.containsKey('files'), isFalse);
        },
      );

      test('reports failure when the envelope is not successful', () async {
        final res = await MessageModule(FakeHttp.failure().dio)
            .edit('chat-1', 0, 'msg-1', 'x');

        expect(res.success, isFalse);
        expect(res.chatEventID, isNull);
        expect(res.data, isNull);
      });
    });

    group('editConfirm', () {
      test('POSTs to /message/edit/confirm', () async {
        final http = FakeHttp.always({'chatEventID': 15});

        final res = await MessageModule(http.dio).editConfirm('msg-4');

        expect(http.only.path, '/message/edit/confirm');
        expect(http.only.body, {'messageUUID': 'msg-4'});
        expect(res.success, isTrue);
        expect(res.chatEventID, 15);
      });

      test('reports failure when the envelope is not successful', () async {
        final res = await MessageModule(FakeHttp.failure().dio)
            .editConfirm('msg-4');

        expect(res.success, isFalse);
        expect(res.data, isNull);
      });
    });

    group('read', () {
      test('POSTs to /message/read and returns the read receipt', () async {
        final http = FakeHttp.always({
          'chatEventID': 21,
          'userUUID': 'user-1',
          'readAt': '2026-01-02T03:04:05Z',
        });

        final res = await MessageModule(http.dio).read('chat-1', 2, 'msg-1');

        expect(http.only.path, '/message/read');
        expect(http.only.body, {
          'chatUUID': 'chat-1',
          'subID': 2,
          'messageID': 'msg-1',
        });
        expect(res.success, isTrue);
        expect(res.chatEventID, 21);
        expect(res.userUUID, 'user-1');
        expect(res.readAt, '2026-01-02T03:04:05Z');
      });

      test('reports failure when the envelope is not successful', () async {
        final res = await MessageModule(FakeHttp.failure().dio)
            .read('chat-1', 0, 'msg-1');

        expect(res.success, isFalse);
        expect(res.chatEventID, isNull);
        expect(res.userUUID, isNull);
        expect(res.readAt, isNull);
      });
    });
  });

  group('MessagePinModule', () {
    test('add PUTs /message/pin and returns pinnedAt', () async {
      final http = FakeHttp.always({
        'pinnedAt': '2026-01-01',
        'chatEventID': 5,
      });

      final res = await MessageModule(http.dio).pin.add('chat-1', 1, 'msg-1');

      expect(http.only.method, 'PUT');
      expect(http.only.path, '/message/pin');
      expect(http.only.body, {
        'chatUUID': 'chat-1',
        'subID': 1,
        'messageID': 'msg-1',
      });
      expect(res.success, isTrue);
      expect(res.pinnedAt, '2026-01-01');
      expect(res.chatEventID, 5);
    });

    test('add reports failure when the envelope is not successful', () async {
      final res = await MessageModule(FakeHttp.failure().dio).pin
          .add('chat-1', 0, 'msg-1');

      expect(res.success, isFalse);
      expect(res.pinnedAt, isNull);
      expect(res.chatEventID, isNull);
    });

    test('remove DELETEs /message/pin and returns the event id', () async {
      final http = FakeHttp.always({'chatEventID': 6});

      final res = await MessageModule(http.dio).pin
          .remove('chat-1', 0, 'msg-1');

      expect(http.only.method, 'DELETE');
      expect(http.only.path, '/message/pin');
      expect(res.success, isTrue);
      expect(res.chatEventID, 6);
    });

    test(
      'remove reports failure when the envelope is not successful',
      () async {
        final res = await MessageModule(FakeHttp.failure().dio).pin
            .remove('chat-1', 0, 'msg-1');

        expect(res.success, isFalse);
        expect(res.chatEventID, isNull);
      },
    );
  });

  group('MessageReactionModule', () {
    test('add PUTs /message/reaction with the emoji', () async {
      final http = FakeHttp.always({
        'reactedAt': '2026-02-02',
        'chatEventID': 8,
      });

      final res = await MessageModule(http.dio).reaction
          .add('chat-1', 3, 'msg-1', '👍');

      expect(http.only.method, 'PUT');
      expect(http.only.path, '/message/reaction');
      expect(http.only.body, {
        'chatUUID': 'chat-1',
        'subID': 3,
        'messageID': 'msg-1',
        'reaction': '👍',
      });
      expect(res.success, isTrue);
      expect(res.reactedAt, '2026-02-02');
      expect(res.chatEventID, 8);
    });

    test('add reports failure when the envelope is not successful', () async {
      final res = await MessageModule(FakeHttp.failure().dio).reaction
          .add('chat-1', 0, 'msg-1', 'x');

      expect(res.success, isFalse);
      expect(res.reactedAt, isNull);
    });

    test('remove DELETEs /message/reaction and returns the event id', () async {
      final http = FakeHttp.always({'chatEventID': 9});

      final res = await MessageModule(http.dio).reaction
          .remove('chat-1', 0, 'msg-1', '👍');

      expect(http.only.method, 'DELETE');
      expect(http.only.path, '/message/reaction');
      expect(http.only.json['reaction'], '👍');
      expect(res.success, isTrue);
      expect(res.chatEventID, 9);
    });

    test(
      'remove reports failure when the envelope is not successful',
      () async {
        final res = await MessageModule(FakeHttp.failure().dio).reaction
            .remove('chat-1', 0, 'msg-1', 'x');

        expect(res.success, isFalse);
        expect(res.chatEventID, isNull);
      },
    );
  });

  group('MessageFavoriteModule', () {
    test('add PUTs /message/favorite and returns createdAt', () async {
      final http = FakeHttp.always({
        'createdAt': '2026-03-03',
        'userEventID': 12,
      });

      final res = await MessageModule(http.dio).favorite.add('chat-1', 0, 42);

      expect(http.only.method, 'PUT');
      expect(http.only.path, '/message/favorite');
      expect(http.only.body, {
        'chatUUID': 'chat-1',
        'subID': 0,
        'messageID': 42,
      });
      expect(res.success, isTrue);
      expect(res.createdAt, '2026-03-03');
      expect(res.userEventID, 12);
    });

    test('add accepts a string message id', () async {
      final http = FakeHttp.always({'createdAt': 'x', 'userEventID': 1});

      await MessageModule(http.dio).favorite.add('chat-1', 0, 'msg-9');

      expect(http.last.json['messageID'], 'msg-9');
    });

    test('add reports failure when the envelope is not successful', () async {
      final res = await MessageModule(FakeHttp.failure().dio).favorite
          .add('chat-1', 0, 1);

      expect(res.success, isFalse);
      expect(res.createdAt, isNull);
    });

    test('remove DELETEs /message/favorite and returns the event id', () async {
      final http = FakeHttp.always({'userEventID': 13});

      final res = await MessageModule(http.dio).favorite
          .remove('chat-1', 0, 42);

      expect(http.only.method, 'DELETE');
      expect(http.only.path, '/message/favorite');
      expect(res.success, isTrue);
      expect(res.userEventID, 13);
    });

    test(
      'remove reports failure when the envelope is not successful',
      () async {
        final res = await MessageModule(FakeHttp.failure().dio).favorite
            .remove('chat-1', 0, 42);

        expect(res.success, isFalse);
        expect(res.userEventID, isNull);
      },
    );
  });
}
