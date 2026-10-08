import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/chat_permission_helpers.dart';
import 'package:novyse/core/chat/permissions.dart';
import 'package:novyse/core/stores/chat_list_store.dart';

void main() {
  group('ChatPermissionHelpers', () {
    test('DM chats allow any action and canUserSendMessage returns true', () {
      const dmChat = ChatModel(
        uuid: 'dm_1',
        name: 'DM Chat',
        type: 'DM',
        unreadCount: 0,
      );

      expect(ChatPermissionHelpers.canUserSendMessage(dmChat, 'user_1'), isTrue);
      expect(
        ChatPermissionHelpers.canUserPerform(
          dmChat,
          'user_1',
          ChatPermissions.manageChat,
        ),
        isTrue,
      );
    });

    test('canUserSendMessage respects role permissions and subType rules', () {
      final groupChat = ChatModel(
        uuid: 'group_1',
        name: 'Group Chat',
        type: 'GROUP',
        unreadCount: 0,
        members: [
          {
            'uuid': 'admin_user',
            'roleIDs': [DefaultRoles.admin],
          },
          {
            'uuid': 'normal_user',
            'roleIDs': [DefaultRoles.user],
          },
          {
            'uuid': 'readonly_user',
            'roleIDs': [99],
          },
        ],
        roles: [
          {
            'id': DefaultRoles.admin,
            'level': 10,
            'permission': (ChatPermissions.sendMessage | ChatPermissions.deleteMessage).toString(),
          },
          {
            'id': DefaultRoles.user,
            'level': 1,
            'permission': ChatPermissions.sendMessage.toString(),
          },
          {
            'id': 99,
            'level': 0,
            'permission': '0',
          },
        ],
        subs: [
          {'id': 1, 'type': 'TEXT'},
          {'id': 2, 'type': 'ANNOUNCE'},
        ],
      );

      // Normal text sub
      expect(ChatPermissionHelpers.canUserSendMessage(groupChat, 'admin_user', subID: 1), isTrue);
      expect(ChatPermissionHelpers.canUserSendMessage(groupChat, 'normal_user', subID: 1), isTrue);
      expect(ChatPermissionHelpers.canUserSendMessage(groupChat, 'readonly_user', subID: 1), isFalse);

      // Announce sub (only owner and admin allowed)
      expect(ChatPermissionHelpers.canUserSendMessage(groupChat, 'admin_user', subID: 2), isTrue);
      expect(ChatPermissionHelpers.canUserSendMessage(groupChat, 'normal_user', subID: 2), isFalse);
    });

    test('canUserDeleteMessage checks ownership, delete permission, and role levels', () {
      final groupChat = ChatModel(
        uuid: 'group_1',
        name: 'Group Chat',
        type: 'GROUP',
        unreadCount: 0,
        members: [
          {
            'uuid': 'owner_user',
            'roleIDs': [DefaultRoles.owner],
          },
          {
            'uuid': 'admin_user',
            'roleIDs': [DefaultRoles.admin],
          },
          {
            'uuid': 'member_user',
            'roleIDs': [DefaultRoles.user],
          },
        ],
        roles: [
          {
            'id': DefaultRoles.owner,
            'level': 100,
            'permission': ChatPermissions.deleteMessage.toString(),
          },
          {
            'id': DefaultRoles.admin,
            'level': 50,
            'permission': ChatPermissions.deleteMessage.toString(),
          },
          {
            'id': DefaultRoles.user,
            'level': 10,
            'permission': '0',
          },
        ],
      );

      // Anyone can delete their own message
      expect(
        ChatPermissionHelpers.canUserDeleteMessage(
          chat: groupChat,
          localUserUUID: 'member_user',
          targetUserUUID: 'member_user',
        ),
        isTrue,
      );

      // Admin can delete member message (admin level 50 >= member level 10 and has permission)
      expect(
        ChatPermissionHelpers.canUserDeleteMessage(
          chat: groupChat,
          localUserUUID: 'admin_user',
          targetUserUUID: 'member_user',
        ),
        isTrue,
      );

      // Admin cannot delete owner message (admin level 50 < owner level 100)
      expect(
        ChatPermissionHelpers.canUserDeleteMessage(
          chat: groupChat,
          localUserUUID: 'admin_user',
          targetUserUUID: 'owner_user',
        ),
        isFalse,
      );

      // Member cannot delete anyone else's message
      expect(
        ChatPermissionHelpers.canUserDeleteMessage(
          chat: groupChat,
          localUserUUID: 'member_user',
          targetUserUUID: 'admin_user',
        ),
        isFalse,
      );
    });
  });
}
