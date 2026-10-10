import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/stores/chat_list_store.dart';

class ChatSearchService {
  const ChatSearchService(this._gateway);

  final Gateway _gateway;

  static const int minQueryLength = 3;

  /// Returns chats and DM candidates matching [query]; empty when the query is
  /// too short or the request fails.
  Future<List<ChatModel>> searchAll(String query, AppLocalizations l10n) async {
    final trimmed = query.trim();
    if (trimmed.length < minQueryLength) return const [];

    try {
      final result = await _gateway.search.all(trimmed);
      final data = result.data;
      if (!result.success || data == null) return const [];

      final out = <ChatModel>[
        ..._usersToChats(data['users'] as List?),
        ..._groupsToChats(data['chats'] as List?, l10n),
      ];
      return out;
    } catch (e) {
      debugPrint('[ChatSearch] Remote search failed: $e');
      return const [];
    }
  }

  List<ChatModel> _usersToChats(List? users) {
    final out = <ChatModel>[];
    for (final u in (users ?? const []).whereType<Map>()) {
      final uuid = u['uuid']?.toString() ?? '';
      if (uuid.isEmpty) continue;
      final name = '${u['name'] ?? ''} ${u['surname'] ?? ''}'.trim();
      final handle = u['handle']?.toString();
      out.add(
        ChatModel(
          uuid: uuid,
          name: name.isNotEmpty ? name : (handle != null ? '@$handle' : ''),
          type: 'DM',
          handle: handle,
          profilePictureUUID:
              u['profilePictureUUID']?.toString() ??
              u['profile_picture_uuid']?.toString(),
          members: [
            {'uuid': uuid},
            {'uuid': 'local_user'},
          ],
          lastMessage: handle != null ? {'content': '@$handle'} : null,
        ),
      );
    }
    return out;
  }

  List<ChatModel> _groupsToChats(List? chats, AppLocalizations l10n) {
    final out = <ChatModel>[];
    for (final c in (chats ?? const []).whereType<Map>()) {
      final handle = c['handle']?.toString();
      final memberCount =
          (c['memberCount'] as num?)?.toInt() ??
          (c['members'] is List ? (c['members'] as List).length : null);
      final subtitle = [
        if (handle != null && handle.isNotEmpty) '@$handle',
        if (memberCount != null) l10n.membersCount(memberCount),
      ].join(' • ');

      out.add(
        ChatModel(
          uuid: c['uuid']?.toString() ?? '',
          name: c['name']?.toString() ?? '',
          type: c['type']?.toString().toUpperCase() ?? 'GROUP',
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
    return out;
  }
}

/// Riverpod provider for [ChatSearchService].
final chatSearchServiceProvider = Provider<ChatSearchService>(
  (ref) => ChatSearchService(apiGateway),
);
