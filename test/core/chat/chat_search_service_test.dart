import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/chat_search_service.dart';
import 'package:novyse/core/l10n/app_localizations_en.dart';
import 'package:novyse/core/stores/chat_list_store.dart';

import '../../helpers/fake_gateway.dart';
import '../../helpers/fake_http.dart';

/// `ChatSearchService` turns the raw `/search/all` payload into `ChatModel`s.
/// Every projection rule below is exercised through a fake transport.
void main() {
  final l10n = AppLocalizationsEn();

  late FakeGateway gateway;
  late ChatSearchService service;

  /// Builds a service whose search replies with [data].
  ChatSearchService withData(Map<String, dynamic> data) {
    gateway = FakeGateway(FakeHttp.always(data));
    return ChatSearchService(gateway);
  }

  group('query guard', () {
    test(
      'does not call the API for a query shorter than the minimum',
      () async {
        service = withData(const {'users': <dynamic>[], 'chats': <dynamic>[]});

        expect(await service.searchAll('ab', l10n), isEmpty);
        expect(gateway.http.requests, isEmpty);
      },
    );

    test('measures the trimmed query, not the raw one', () async {
      service = withData(const {'users': <dynamic>[], 'chats': <dynamic>[]});

      expect(await service.searchAll('  ab  ', l10n), isEmpty);
      expect(gateway.http.requests, isEmpty);
    });

    test('exposes the minimum query length', () {
      expect(ChatSearchService.minQueryLength, 3);
    });

    test('trims the query before sending it', () async {
      service = withData(const {'users': <dynamic>[], 'chats': <dynamic>[]});

      await service.searchAll('  ada  ', l10n);

      expect(gateway.http.only.query, {'query': 'ada'});
    });
  });

  group('failure handling', () {
    test('returns empty when the envelope fails', () async {
      service = ChatSearchService(FakeGateway.failure());

      expect(await service.searchAll('ada', l10n), isEmpty);
    });

    test('returns empty when the data is null', () async {
      service = ChatSearchService(FakeGateway.always(null));

      expect(await service.searchAll('ada', l10n), isEmpty);
    });

    test('returns empty when the request throws', () async {
      service = ChatSearchService(FakeGateway.offline());

      expect(await service.searchAll('ada', l10n), isEmpty);
    });
  });

  group('users are projected into DM candidates', () {
    test('keeps the full name and the handle', () async {
      service = withData({
        'users': [
          {'uuid': 'u1', 'name': 'Ada', 'surname': 'Lovelace', 'handle': 'ada'},
        ],
      });

      final chat = (await service.searchAll('ada', l10n)).single;
      expect(chat.uuid, 'u1');
      expect(chat.name, 'Ada Lovelace');
      expect(chat.type, 'DM');
      expect(chat.handle, 'ada');
      expect(chat.lastMessage, {'content': '@ada'});
    });

    test('falls back to the handle when there is no name', () async {
      service = withData({
        'users': [
          {'uuid': 'u1', 'handle': 'ada'},
        ],
      });

      expect((await service.searchAll('ada', l10n)).single.name, '@ada');
    });

    test('falls back to an empty name when neither is present', () async {
      service = withData({
        'users': [
          {'uuid': 'u1'},
        ],
      });

      final chat = (await service.searchAll('ada', l10n)).single;
      expect(chat.name, '');
      expect(chat.lastMessage, isNull);
    });

    test(
      'trims the joined name so a missing surname leaves no space',
      () async {
        service = withData({
          'users': [
            {'uuid': 'u1', 'name': 'Ada'},
          ],
        });

        expect((await service.searchAll('ada', l10n)).single.name, 'Ada');
      },
    );

    test('reads the snake_case picture uuid as a fallback', () async {
      service = withData({
        'users': [
          {'uuid': 'u1', 'profile_picture_uuid': 'pic-snake'},
        ],
      });

      expect(
        (await service.searchAll('ada', l10n)).single.profilePictureUUID,
        'pic-snake',
      );
    });

    test('prefers the camelCase picture uuid', () async {
      service = withData({
        'users': [
          {
            'uuid': 'u1',
            'profilePictureUUID': 'pic-camel',
            'profile_picture_uuid': 'pic-snake',
          },
        ],
      });

      expect(
        (await service.searchAll('ada', l10n)).single.profilePictureUUID,
        'pic-camel',
      );
    });

    test('skips a user with no uuid', () async {
      service = withData({
        'users': [
          {'name': 'No Id'},
          {'uuid': '', 'name': 'Blank Id'},
          {'uuid': 'u1', 'name': 'Ada'},
        ],
      });

      final results = await service.searchAll('ada', l10n);
      expect(results, hasLength(1));
      expect(results.single.uuid, 'u1');
    });

    test('ignores non-map entries', () async {
      service = withData({
        'users': [
          'nope',
          42,
          {'uuid': 'u1'},
        ],
      });

      expect((await service.searchAll('ada', l10n)).single.uuid, 'u1');
    });

    test('pairs the user with a local_user placeholder member', () async {
      service = withData({
        'users': [
          {'uuid': 'u1'},
        ],
      });

      expect((await service.searchAll('ada', l10n)).single.members, [
        {'uuid': 'u1'},
        {'uuid': 'local_user'},
      ]);
    });
  });

  group('groups are projected into chat candidates', () {
    test('uppercases the type and keeps the members', () async {
      service = withData({
        'chats': [
          {
            'uuid': 'c1',
            'name': 'The Squad',
            'type': 'forum',
            'handle': 'squad',
            'members': [
              {'uuid': 'u1'},
            ],
          },
        ],
      });

      final chat = (await service.searchAll('squad', l10n)).single;
      expect(chat.uuid, 'c1');
      expect(chat.name, 'The Squad');
      expect(chat.type, 'FORUM');
      expect(chat.members, [
        {'uuid': 'u1'},
      ]);
    });

    test('defaults the type to GROUP', () async {
      service = withData({
        'chats': [
          {'uuid': 'c1', 'name': 'No type'},
        ],
      });

      expect((await service.searchAll('no type', l10n)).single.type, 'GROUP');
    });

    test('builds a subtitle from the handle and the member count', () async {
      service = withData({
        'chats': [
          {
            'uuid': 'c1',
            'name': 'The Squad',
            'handle': 'squad',
            'members': [
              {'uuid': 'u1'},
              {'uuid': 'u2'},
            ],
          },
        ],
      });

      final chat = (await service.searchAll('squad', l10n)).single;
      expect(chat.lastMessage, {'content': '@squad • ${l10n.membersCount(2)}'});
    });

    test('prefers an explicit memberCount over the members list', () async {
      service = withData({
        'chats': [
          {
            'uuid': 'c1',
            'name': 'The Squad',
            'handle': 'squad',
            'memberCount': 9,
            'members': [
              {'uuid': 'u1'},
            ],
          },
        ],
      });

      expect((await service.searchAll('squad', l10n)).single.lastMessage, {
        'content': '@squad • ${l10n.membersCount(9)}',
      });
    });

    test(
      'falls back to the members list when memberCount is a double',
      () async {
        service = withData({
          'chats': [
            {
              'uuid': 'c1',
              'name': 'The Squad',
              'handle': 'squad',
              'memberCount': 4.0,
              'members': [
                {'uuid': 'u1'},
              ],
            },
          ],
        });

        expect((await service.searchAll('squad', l10n)).single.lastMessage, {
          'content': '@squad • ${l10n.membersCount(4)}',
        });
      },
    );

    test('a non-numeric memberCount voids the whole result set', () async {
      // `_groupsToChats` casts memberCount straight to `num?`, so a malformed
      // value throws and `searchAll`'s catch-all turns the entire response
      // into an empty list rather than degrading per row.
      service = withData({
        'users': [
          {'uuid': 'u1', 'name': 'Ada'},
        ],
        'chats': [
          {
            'uuid': 'c1',
            'name': 'The Squad',
            'memberCount': 'many',
            'members': [
              {'uuid': 'u1'},
            ],
          },
        ],
      });

      expect(await service.searchAll('squad', l10n), isEmpty);
    });

    test('omits the handle from the subtitle when it is empty', () async {
      service = withData({
        'chats': [
          {
            'uuid': 'c1',
            'name': 'The Squad',
            'handle': '',
            'members': [
              {'uuid': 'u1'},
            ],
          },
        ],
      });

      expect((await service.searchAll('squad', l10n)).single.lastMessage, {
        'content': l10n.membersCount(1),
      });
    });

    test(
      'leaves the subtitle empty without a handle or a member count',
      () async {
        service = withData({
          'chats': [
            {'uuid': 'c1', 'name': 'Bare'},
          ],
        });

        expect(
          (await service.searchAll('bare', l10n)).single.lastMessage,
          isNull,
        );
      },
    );

    test('defaults uuid and name to empty strings', () async {
      service = withData({
        'chats': [
          {'type': 'GROUP'},
        ],
      });

      final chat = (await service.searchAll('group', l10n)).single;
      expect(chat.uuid, '');
      expect(chat.name, '');
    });

    test('does not drop a group with a blank uuid, unlike a user', () async {
      service = withData({
        'users': [
          {'uuid': ''},
        ],
        'chats': [
          {'uuid': '', 'name': 'Blank'},
        ],
      });

      final results = await service.searchAll('blank', l10n);
      expect(results.map((c) => c.name), ['Blank']);
    });

    test('filters non-map members', () async {
      service = withData({
        'chats': [
          {
            'uuid': 'c1',
            'name': 'The Squad',
            'members': [
              'nope',
              {'uuid': 'u1'},
            ],
          },
        ],
      });

      expect((await service.searchAll('squad', l10n)).single.members, [
        {'uuid': 'u1'},
      ]);
    });

    test('defaults members to empty when absent', () async {
      service = withData({
        'chats': [
          {'uuid': 'c1', 'name': 'The Squad'},
        ],
      });

      expect((await service.searchAll('squad', l10n)).single.members, isEmpty);
    });
  });

  group('result ordering', () {
    test('puts users before chats', () async {
      service = withData({
        'users': [
          {'uuid': 'u1', 'name': 'Ada'},
        ],
        'chats': [
          {'uuid': 'c1', 'name': 'Squad', 'type': 'GROUP'},
        ],
      });

      final results = await service.searchAll('ada', l10n);
      expect(results.map((c) => c.uuid), ['u1', 'c1']);
    });

    test('handles missing users and chats keys', () async {
      service = withData(const <String, dynamic>{});

      expect(await service.searchAll('ada', l10n), isEmpty);
    });

    test('every result is a ChatModel', () async {
      service = withData({
        'users': [
          {'uuid': 'u1'},
        ],
        'chats': [
          {'uuid': 'c1'},
        ],
      });

      expect(
        await service.searchAll('ada', l10n),
        everyElement(isA<ChatModel>()),
      );
    });
  });
}
