import 'package:flutter/foundation.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/api_gateway.dart';
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

/// Searches the remote API gateway (/search/all) for users and chats matching [query].
Future<List<ChatModel>> searchRemoteChats(String query) async {
  final trimmed = query.trim();
  if (trimmed.length < 3) return const [];

  try {
    final result = await apiGateway.search.all(trimmed);
    if (!result.success || result.data == null) return const [];

    final data = result.data!;
    final usersList = (data['users'] as List?)?.whereType<Map>() ?? [];
    final chatsList = (data['chats'] as List?)?.whereType<Map>() ?? [];

    final remoteChats = <ChatModel>[];

    for (final u in usersList) {
      final name = '${u['name'] ?? ''} ${u['surname'] ?? ''}'.trim();
      final handle = u['handle']?.toString();
      final displayName = name.isNotEmpty
          ? name
          : (handle != null ? '@$handle' : 'User');
      remoteChats.add(
        ChatModel(
          uuid: u['uuid']?.toString() ?? '',
          name: displayName,
          type: 'DM',
          handle: handle,
          profilePictureUUID:
              u['profilePictureUUID']?.toString() ??
              u['profile_picture_uuid']?.toString(),
          members: [
            {'uuid': u['uuid']},
            {'uuid': 'local_user'},
          ],
          lastMessage: handle != null ? {'content': '@$handle'} : null,
        ),
      );
    }

    for (final c in chatsList) {
      final handle = c['handle']?.toString();
      final memberCount =
          (c['memberCount'] as num?)?.toInt() ??
          (c['members'] is List ? (c['members'] as List).length : null);
      final subtitle = [
        if (handle != null && handle.isNotEmpty) '@$handle',
        if (memberCount != null) '$memberCount membri',
      ].join(' • ');

      remoteChats.add(
        ChatModel(
          uuid: c['uuid']?.toString() ?? '',
          name: c['name']?.toString() ?? '',
          type: (c['type']?.toString().toUpperCase()) ?? 'GROUP',
          handle: handle,
          profilePictureUUID:
              c['profilePictureUUID']?.toString() ??
              c['profile_picture_uuid']?.toString(),
          members: c['members'] is List
              ? (c['members'] as List)
                    .whereType<Map>()
                    .map((m) => Map<String, dynamic>.from(m))
                    .toList()
              : const [],
          lastMessage: subtitle.isNotEmpty ? {'content': subtitle} : null,
        ),
      );
    }

    return remoteChats;
  } catch (e) {
    debugPrint('Error searching remote chats: $e');
    return const [];
  }
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
