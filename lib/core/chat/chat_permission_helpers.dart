import 'package:novyse/core/chat/permissions.dart';
import 'package:novyse/core/stores/chat_list_store.dart';

/// Helper utilities for evaluating member roles and permissions in a [ChatModel].
abstract final class ChatPermissionHelpers {
  /// Resolves the role maps assigned to [userUUID] within [chat].
  static List<Map<String, dynamic>> getMemberRoles(
    ChatModel? chat,
    String userUUID,
  ) {
    if (chat == null) return const [];
    final member =
        chat.members.where((m) => m['uuid'] == userUUID).firstOrNull;
    final roleIDs = (member?['roleIDs'] as List?) ?? const [];
    return chat.roles.where((r) => roleIDs.contains(r['id'])).toList();
  }

  /// Checks if [userUUID] possesses [requiredPermission] in [chat] for [subID].
  static bool canUserPerform(
    ChatModel? chat,
    String userUUID,
    BigInt requiredPermission, {
    int subID = 0,
  }) {
    if (chat == null || chat.type == 'DM') return true;
    final memberRoles = getMemberRoles(chat, userUUID);
    final sub = chat.subs.where((s) => s['id'] == subID).firstOrNull;
    final subType = sub?['type'] as String?;
    return hasPermission(memberRoles, requiredPermission, subType);
  }

  /// Convenience check for whether [userUUID] is permitted to send messages in [chat].
  static bool canUserSendMessage(
    ChatModel? chat,
    String userUUID, {
    int subID = 0,
  }) {
    return canUserPerform(
      chat,
      userUUID,
      ChatPermissions.sendMessage,
      subID: subID,
    );
  }

  /// Checks whether [localUserUUID] can delete a message sent by [targetUserUUID].
  static bool canUserDeleteMessage({
    required ChatModel? chat,
    required String localUserUUID,
    required String targetUserUUID,
  }) {
    if (localUserUUID == targetUserUUID) return true;
    if (chat == null || chat.type == 'DM') return false;

    final myRoles = getMemberRoles(chat, localUserUUID);
    final myLevel = getEffectiveLevel(myRoles);

    final targetRoles = getMemberRoles(chat, targetUserUUID);
    final targetLevel = getEffectiveLevel(targetRoles);

    return hasPermission(myRoles, ChatPermissions.deleteMessage) &&
        myLevel >= targetLevel;
  }
}
