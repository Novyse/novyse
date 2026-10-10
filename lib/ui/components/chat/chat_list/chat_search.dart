import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';

List<ChatModel> filterChatsByQuery({
  required List<ChatModel> chats,
  required String query,
  required String localUserUUID,
  required Map<String, UserModel> users,
  required AppLocalizations l10n,
}) {
  final needle = query.toLowerCase();
  return chats.where((chat) {
    final candidates = <String>[
      chat.name,
      if (chat.handle != null && chat.handle!.isNotEmpty) ...[
        chat.handle!,
        '@${chat.handle!}',
      ],
    ];
    if (chat.type == 'DM') {
      final metadata = resolveChatMetadata(
        chat: chat,
        localUserUUID: localUserUUID,
        users: users,
        l10n: l10n,
      );
      candidates.add(metadata.name);
      final other = metadata.otherUserUUID != null
          ? users[metadata.otherUserUUID]
          : null;
      if (other != null) {
        candidates.add(other.displayName);
        if (other.handle != null && other.handle!.isNotEmpty) {
          candidates.addAll([other.handle!, '@${other.handle!}']);
        }
      }
    }
    return candidates.any((c) => c.toLowerCase().contains(needle));
  }).toList();
}

/// Filters out remote chats that are already present locally by uuid or handle.
List<ChatModel> filterRemoteChats({
  required List<ChatModel> local,
  required List<ChatModel> remote,
}) {
  final localKeys = <String>{
    for (final c in local) ...[
      if (c.uuid.isNotEmpty) c.uuid,
      if (c.handle != null && c.handle!.isNotEmpty) c.handle!.toLowerCase(),
      if (c.type == 'DM')
        for (final m in c.members) ...[
          if (m['uuid'] != null) m['uuid'].toString(),
          if (m['handle'] != null) m['handle'].toString().toLowerCase(),
        ],
    ],
  };

  return remote.where((r) {
    if (r.uuid.isNotEmpty && localKeys.contains(r.uuid)) {
      return false;
    }
    if (r.handle != null && localKeys.contains(r.handle!.toLowerCase())) {
      return false;
    }
    return true;
  }).toList();
}

Future<List<Map<String, dynamic>>> searchMessagesByQuery(
  String query, {
  int limit = 50,
}) {
  return AppDatabase.instance.message.search(query, limit: limit);
}
