import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/services/api/modules/check_module.dart';
import 'package:novyse/core/services/api/modules/comms_module.dart';
import 'package:novyse/core/services/api/modules/file_module.dart';
import 'package:novyse/core/services/api/modules/gather_module.dart';
import 'package:novyse/core/services/api/modules/notification_module.dart';
import 'package:novyse/core/services/api/modules/search_module.dart';
import 'package:novyse/core/services/api/modules/watch_together_module.dart';

import '../../../helpers/fake_http.dart';

void main() {
  group('CheckModule', () {
    test('handle GETs the availability without auth', () async {
      final http = FakeHttp.always({'available': true});

      final res = await CheckModule(http.dio).handle('ada');

      expect(http.only.path, '/check/handle');
      expect(http.only.query, {'handle': 'ada'});
      expect(http.only.options.extra['skipAuth'], isTrue);
      expect(res.success, isTrue);
      expect(res.available, isTrue);
    });

    test('handle reports an unavailable handle', () async {
      final res = await CheckModule(FakeHttp.always({'available': false}).dio)
          .handle('taken');

      expect(res.success, isTrue);
      expect(res.available, isFalse);
    });

    test(
      'handle reports failure when the envelope is not successful',
      () async {
        final res = await CheckModule(FakeHttp.failure().dio).handle('ada');

        expect(res.success, isFalse);
        expect(res.available, isNull);
      },
    );
  });

  group('GatherModule', () {
    test('handle uses the essentials path by default', () async {
      final http = FakeHttp.always({'uuid': 'u1'});

      final res = await GatherModule(http.dio).handle('ada');

      expect(http.only.path, '/gather/handle/essentials');
      expect(http.only.query, {'query': 'ada'});
      expect(res.success, isTrue);
      expect(res.data, {'uuid': 'u1'});
    });

    test('handle uses the detailed path when asked', () async {
      final http = FakeHttp.always({'uuid': 'u1'});

      await GatherModule(http.dio).handle('ada', detailed: true);

      expect(http.only.path, '/gather/handle');
    });

    test(
      'handle reports failure when the envelope is not successful',
      () async {
        final res = await GatherModule(FakeHttp.failure().dio).handle('ada');

        expect(res.success, isFalse);
        expect(res.data, isNull);
      },
    );
  });

  group('FileModule', () {
    test('retrieve GETs the file metadata and download URL', () async {
      final http = FakeHttp.always({
        'downloadURL': 'https://s3.test/get',
        'expiresAt': '2026-01-01T00:00:00Z',
        'name': 'photo.png',
        'size': 4096,
        'mimeType': 'image/png',
      });

      final res = await FileModule(http.dio).retrieve('file-1');

      expect(http.only.path, '/file');
      expect(http.only.query, {'fileUUID': 'file-1'});
      expect(res.success, isTrue);
      expect(res.downloadURL, 'https://s3.test/get');
      expect(res.expiresAt, '2026-01-01T00:00:00Z');
      expect(res.name, 'photo.png');
      expect(res.size, 4096);
      expect(res.mimeType, 'image/png');
    });

    test(
      'retrieve reports failure when the envelope is not successful',
      () async {
        final res = await FileModule(FakeHttp.failure().dio).retrieve('file-1');

        expect(res.success, isFalse);
        expect(res.downloadURL, isNull);
        expect(res.size, isNull);
        expect(res.mimeType, isNull);
      },
    );

    test('delete DELETEs the file and returns whether it succeeded', () async {
      final ok = FakeHttp.always(null);
      expect(await FileModule(ok.dio).delete('file-1'), isTrue);
      expect(ok.only.method, 'DELETE');
      expect(ok.only.path, '/file');
      expect(ok.only.query, {'fileUUID': 'file-1'});

      expect(
        await FileModule(FakeHttp.failure().dio).delete('file-1'),
        isFalse,
      );
    });
  });

  group('NotificationModule', () {
    test(
      'setFCMToken PATCHes the token and returns whether it succeeded',
      () async {
        final ok = FakeHttp.always(null);
        expect(await NotificationModule(ok.dio).setFCMToken('tok'), isTrue);
        expect(ok.only.method, 'PATCH');
        expect(ok.only.path, '/notification/push-token');
        expect(ok.only.json, {'pushToken': 'tok'});

        expect(
          await NotificationModule(FakeHttp.failure().dio).setFCMToken('tok'),
          isFalse,
        );
      },
    );

    test('deleteFCMToken DELETEs and returns whether it succeeded', () async {
      final ok = FakeHttp.always(null);
      expect(await NotificationModule(ok.dio).deleteFCMToken(), isTrue);
      expect(ok.only.method, 'DELETE');

      expect(
        await NotificationModule(FakeHttp.failure().dio).deleteFCMToken(),
        isFalse,
      );
    });

    test('deleteFCMToken swallows transport errors', () async {
      expect(
        await NotificationModule(FakeHttp.offline().dio).deleteFCMToken(),
        isFalse,
      );
    });
  });

  group('SearchModule', () {
    test('all GETs the query and returns the raw result map', () async {
      final http = FakeHttp.always({
        'users': [
          {'uuid': 'u1'},
        ],
        'chats': <dynamic>[],
      });

      final res = await SearchModule(http.dio).all('ad');

      expect(http.only.path, '/search/all');
      expect(http.only.query, {'query': 'ad'});
      expect(res.success, isTrue);
      expect(res.data, {
        'users': [
          {'uuid': 'u1'},
        ],
        'chats': <dynamic>[],
      });
    });

    test('all reports failure when the envelope is not successful', () async {
      final res = await SearchModule(FakeHttp.failure().dio).all('ad');

      expect(res.success, isFalse);
      expect(res.data, isNull);
    });

    test('gif sends the default paging parameters', () async {
      final http = FakeHttp.always({
        'items': [
          {'id': 'g1'},
        ],
        'providers': ['tenor'],
      });

      final res = await SearchModule(http.dio).gif();

      expect(http.only.path, '/search/gif');
      expect(http.only.query, {
        'query': '',
        'limit': '24',
        'page': '1',
        'provider': 'all',
      });
      expect(res.success, isTrue);
      expect(res.error, isNull);
      expect(res.data, {
        'items': [
          {'id': 'g1'},
        ],
        'providers': ['tenor'],
      });
    });

    test('gif forwards a custom query, limit, page and provider', () async {
      final http = FakeHttp.always(<String, dynamic>{});

      await SearchModule(http.dio)
          .gif(query: 'cat', limit: 5, page: 3, provider: 'giphy');

      expect(http.only.query, {
        'query': 'cat',
        'limit': '5',
        'page': '3',
        'provider': 'giphy',
      });
    });

    test('gif wraps a bare list payload into items', () async {
      final http = FakeHttp.always([
        {'id': 'g1'},
      ]);

      final res = await SearchModule(http.dio).gif();

      expect(res.data, {
        'items': [
          {'id': 'g1'},
        ],
        'providers': <dynamic>[],
      });
    });

    test('gif defaults missing items and providers to empty lists', () async {
      final res = await SearchModule(
        FakeHttp.always({
          'items': [
            {'id': 'g1'},
          ],
        }).dio,
      ).gif();

      expect(res.data, {
        'items': [
          {'id': 'g1'},
        ],
        'providers': <dynamic>[],
      });
    });

    test('gif surfaces the error message when the envelope fails', () async {
      final res = await SearchModule(
        FakeHttp.replying(
          (_) =>
              envelope(success: false, data: null)..['error'] = 'rate limited',
        ).dio,
      ).gif();

      expect(res.success, isFalse);
      expect(res.data, isNull);
      expect(res.error, 'rate limited');
    });
  });

  group('CommsModule', () {
    test('getToken GETs the token and url for the room', () async {
      final http = FakeHttp.always({
        'token': 'jwt',
        'url': 'wss://livekit.test',
      });

      final res = await CommsModule(http.dio).getToken('chat-1', sub: 2);

      expect(http.only.path, '/comms/token');
      expect(http.only.query, {'chatUUID': 'chat-1', 'sub': 2});
      expect(res.success, isTrue);
      expect(res.token, 'jwt');
      expect(res.url, 'wss://livekit.test');
    });

    test(
      'getToken reports failure when the envelope is not successful',
      () async {
        final res = await CommsModule(FakeHttp.failure().dio)
            .getToken('chat-1');

        expect(res.success, isFalse);
        expect(res.token, isNull);
        expect(res.url, isNull);
      },
    );
  });

  group('CommsRoomModule', () {
    test('get returns the room and participants', () async {
      final http = FakeHttp.always({
        'room': {'name': 'room-1'},
        'participants': [
          {'identity': 'u1'},
        ],
      });

      final res = await CommsModule(http.dio).room.get('chat-1');

      expect(http.only.path, '/comms/room');
      expect(http.only.query, {'chatUUID': 'chat-1', 'sub': 0});
      expect(res.success, isTrue);
      expect(res.room, {'name': 'room-1'});
      expect(res.participants, [
        {'identity': 'u1'},
      ]);
    });

    test('get reports failure when the envelope is not successful', () async {
      final res = await CommsModule(FakeHttp.failure().dio).room.get('chat-1');

      expect(res.success, isFalse);
      expect(res.room, isNull);
      expect(res.participants, isNull);
    });

    test('get treats a 404 as an empty room rather than an error', () async {
      final http = FakeHttp.replying((options) {
        throw DioException(
          requestOptions: options,
          response: Response<dynamic>(requestOptions: options, statusCode: 404),
        );
      });

      final res = await CommsModule(http.dio).room.get('chat-1');

      expect(res.success, isTrue);
      expect(res.room, isEmpty);
      expect(res.participants, isEmpty);
    });

    test('get rethrows non-404 transport errors', () async {
      final module = CommsModule(FakeHttp.offline().dio).room;

      expect(module.get('chat-1'), throwsA(isA<DioException>()));
    });
  });

  group('WatchTogetherModule', () {
    late FakeHttp http;
    late WatchTogetherModule module;

    setUp(() {
      http = FakeHttp.always({'ok': true});
      module = WatchTogetherModule(http.dio);
    });

    test('start posts the room and url, returning the raw envelope', () async {
      final res = await module.start('room-1', 'https://youtu.be/x');

      expect(http.only.method, 'POST');
      expect(http.only.path, '/comms/watch-together/start');
      expect(http.only.json, {
        'roomUUID': 'room-1',
        'url': 'https://youtu.be/x',
      });
      expect(res, {
        'success': true,
        'data': {'ok': true},
      });
    });

    test('play posts the timestamp', () async {
      await module.play('room-1', 12.5);

      expect(http.only.path, '/comms/watch-together/play');
      expect(http.only.json, {'roomUUID': 'room-1', 'timestamp': 12.5});
    });

    test('pause posts the timestamp', () async {
      await module.pause('room-1', 20.0);

      expect(http.only.path, '/comms/watch-together/pause');
      expect(http.only.json, {'roomUUID': 'room-1', 'timestamp': 20.0});
    });

    test('seek posts the timestamp', () async {
      await module.seek('room-1', 0.0);

      expect(http.only.path, '/comms/watch-together/seek');
      expect(http.only.json, {'roomUUID': 'room-1', 'timestamp': 0.0});
    });

    test('stop posts only the room', () async {
      await module.stop('room-1');

      expect(http.only.path, '/comms/watch-together/stop');
      expect(http.only.json, {'roomUUID': 'room-1'});
    });
  });
}
