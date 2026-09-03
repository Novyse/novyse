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

Future<List<Map<String, dynamic>>> searchMessagesByQuery(
  String query, {
  int limit = 50,
}) {
  return AppDatabase.instance.message.search(query, limit: limit);
}
