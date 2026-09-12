import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/permissions.dart';

void main() {
  group('ANNOUNCE write permissions', () {
    test('blocks regular users', () {
      final regularUserRoles = [
        {
          'id': DefaultRoles.user,
          'permission':
              (ChatPermissions.readMessage | ChatPermissions.sendMessage)
                  .toString(),
          'level': 1,
        },
      ];

      expect(
        hasPermission(
          regularUserRoles,
          ChatPermissions.sendMessage,
          'ANNOUNCE',
        ),
        isFalse,
      );
    });

    test('allows admin', () {
      expect(
        hasPermission(
          [
            {
              'id': DefaultRoles.admin,
              'permission': ChatPermissions.sendMessage.toString(),
              'level': 50,
            },
          ],
          ChatPermissions.sendMessage,
          'ANNOUNCE',
        ),
        isTrue,
      );
    });
  });
}
