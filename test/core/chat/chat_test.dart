import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/chat.dart';

void main() {
  group('Chat Permissions Tests', () {
    test('evaluates basic role permissions correctly', () {
      final userRoles = [
        {
          'id': DefaultRoles.user,
          'permission': (ChatPermissions.readMessage | ChatPermissions.sendMessage).toString(),
          'level': 1,
        },
      ];

      expect(hasPermission(userRoles, ChatPermissions.readMessage), isTrue);
      expect(hasPermission(userRoles, ChatPermissions.sendMessage), isTrue);
      expect(hasPermission(userRoles, ChatPermissions.pinMessage), isFalse);
      expect(hasPermission(userRoles, ChatPermissions.manageChat), isFalse);
    });

    test('enforces ANNOUNCE subType restrictions for regular users', () {
      final regularUserRoles = [
        {
          'id': DefaultRoles.user,
          'permission': (ChatPermissions.readMessage | ChatPermissions.sendMessage | ChatPermissions.attachFileMessage).toString(),
          'level': 1,
        },
      ];

      final adminRoles = [
        {
          'id': DefaultRoles.admin,
          'permission': (ChatPermissions.readMessage | ChatPermissions.sendMessage | ChatPermissions.attachFileMessage).toString(),
          'level': 50,
        },
      ];

      // In regular chat, regular user can send
      expect(hasPermission(regularUserRoles, ChatPermissions.sendMessage), isTrue);

      // In ANNOUNCE subType, regular user CANNOT send or attach files
      expect(hasPermission(regularUserRoles, ChatPermissions.sendMessage, 'ANNOUNCE'), isFalse);
      expect(hasPermission(regularUserRoles, ChatPermissions.attachFileMessage, 'ANNOUNCE'), isFalse);
      expect(hasPermission(regularUserRoles, ChatPermissions.readMessage, 'ANNOUNCE'), isTrue);

      // Admin CAN send in ANNOUNCE
      expect(hasPermission(adminRoles, ChatPermissions.sendMessage, 'ANNOUNCE'), isTrue);
    });

    test('getEffectiveLevel returns max role level', () {
      final roles = [
        {'id': 2, 'level': 5},
        {'id': 1, 'level': 80},
        {'id': 3, 'level': 20},
      ];

      expect(getEffectiveLevel(roles), equals(80));
      expect(getEffectiveLevel([]), equals(0));
    });
  });

  group('Message Format & GIF Tests', () {
    test('extractGifUrls and stripGifUrls', () {
      const text = 'Check this out http://example.com/fun.gif and https://cdn.com/cat.gif pretty cool';
      final gifs = extractGifUrls(text);
      expect(gifs, equals(['https://example.com/fun.gif', 'https://cdn.com/cat.gif']));

      final stripped = stripGifUrls(text);
      expect(stripped, equals('Check this out and pretty cool'));
    });

    test('formats single image attachment preview', () {
      final formatted = formatMessage({
        'type': 'message',
        'content': '',
        'files': [
          {'mimeType': 'image/png', 'name': 'photo.png'},
        ],
      });

      expect(formatted['content'], equals('📷 Photo'));
    });

    test('formats voice message with duration', () {
      final formatted = formatMessage({
        'type': 'message',
        'content': '',
        'files': [
          {'mimeType': 'audio/m4a', 'name': 'novyse_vocal_123.m4a', 'duration': 75},
        ],
      });

      expect(formatted['content'], equals('🎤 Voice message 1:15'));
    });

    test('formats multiple mixed media attachments', () {
      final formatted = formatMessage({
        'type': 'message',
        'content': '',
        'files': [
          {'mimeType': 'image/jpeg', 'name': 'img.jpg'},
          {'mimeType': 'video/mp4', 'name': 'clip.mp4'},
        ],
      });

      expect(formatted['content'], equals('2 📎 Media'));
    });

    test('formats pure GIF content', () {
      final formatted = formatMessage({
        'type': 'message',
        'content': 'https://media.giphy.com/media/test.gif',
      });

      expect(formatted['content'], equals('🎞️ GIF'));
    });

    test('formats system messages correctly', () {
      final created = formatMessage({
        'type': 'system',
        'system_action': 'CHAT_CREATED',
      });
      expect(created['content'], equals('Chat created'));

      final joined = formatMessage(
        {
          'type': 'system',
          'system_action': 'USER_JOINED',
          'content': 'user-123',
        },
        getUser: (uuid) => {'name': 'Alice'},
      );
      expect(joined['content'], equals('Alice joined the chat'));

      final youJoined = formatMessage(
        {
          'type': 'system',
          'system_action': 'USER_JOINED',
          'content': 'me-uuid',
        },
        localUserUUID: 'me-uuid',
      );
      expect(youJoined['content'], equals('You joined the chat'));
    });

    test('formats activity indicators for 1, 2 and 3+ members', () {
      final users = {
        'u1': {'name': 'Alice'},
        'u2': {'name': 'Bob'},
        'u3': {'name': 'Charlie'},
      };

      final oneTyping = formatActivity(
        [
          {'action': 'TYPING', 'userUUID': 'u1'},
        ],
        getUser: (uuid) => users[uuid],
      );
      expect(oneTyping, equals('Alice is typing...'));

      final twoTyping = formatActivity(
        [
          {'action': 'TYPING', 'userUUID': 'u1'},
          {'action': 'TYPING', 'userUUID': 'u2'},
        ],
        getUser: (uuid) => users[uuid],
      );
      expect(twoTyping, equals('Alice and Bob are typing...'));

      final threeTyping = formatActivity(
        [
          {'action': 'TYPING', 'userUUID': 'u1'},
          {'action': 'TYPING', 'userUUID': 'u2'},
          {'action': 'TYPING', 'userUUID': 'u3'},
        ],
        getUser: (uuid) => users[uuid],
      );
      expect(threeTyping, equals('Alice, Bob and 1 others are typing...'));
    });

    test('formats last seen relative dates', () {
      final now = DateTime.now();
      expect(formatLastSeen(now.subtract(const Duration(seconds: 5))), equals('Just now'));
      expect(formatLastSeen(now.subtract(const Duration(seconds: 30))), equals('30s ago'));
      expect(formatLastSeen(now.subtract(const Duration(minutes: 5))), equals('5m ago'));
      expect(formatLastSeen(now.subtract(const Duration(hours: 3))), equals('3h ago'));
    });
  });
}
