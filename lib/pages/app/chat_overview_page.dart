import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:novyse/core/chat/message_format.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/pages/app/chat_routes.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';
import 'package:novyse/ui/components/huge_icon.dart';

enum _OverviewTab { members, media, files, links, music, voice, gifs }

class ChatOverviewPage extends ConsumerStatefulWidget {
  const ChatOverviewPage({super.key, required this.chatUUID, required this.subID});

  final String chatUUID;
  final int subID;

  @override
  ConsumerState<ChatOverviewPage> createState() => _ChatOverviewPageState();
}

class _ChatOverviewPageState extends ConsumerState<ChatOverviewPage> {
  _OverviewTab? _tab;

  _OverviewTab _effectiveTab(bool isDM) {
    if (_tab != null) {
      if (isDM && _tab == _OverviewTab.members) return _OverviewTab.media;
      return _tab!;
    }
    return isDM ? _OverviewTab.media : _OverviewTab.members;
  }

  List<int> _scopeSubIDs(ChatModel chat, int effectiveSub) {
    if (chat.type != 'FORUM') {
      if (chat.subs.isNotEmpty) {
        return chat.subs.map((s) => (s['id'] as num).toInt()).toList();
      }
      return [effectiveSub];
    }
    return [effectiveSub];
  }

  void _ensureMessagesLoaded(ChatModel chat, int effectiveSub) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      for (final subID in _scopeSubIDs(chat, effectiveSub)) {
        try {
          ref
              .read(
                chatMessagesProvider((
                  chatUUID: widget.chatUUID,
                  subID: subID,
                )).notifier,
              )
              .init();
        } catch (_) {}
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final chat = ref.watch(chatProvider(widget.chatUUID));
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    if (chat == null) {
      return Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedArrowLeft01),
            onPressed: () => Navigator.of(context).maybePop(),
          ),
          title: Text(l10n.chatNotFound),
        ),
        body: Center(child: Text(l10n.chatNotFoundWithId(widget.chatUUID))),
      );
    }

    final localUserUUID = ref.watch(
      userStoreProvider.select((s) => s.localUserUUID),
    );
    final users = ref.watch(userStoreProvider.select((s) => s.users));
    final metadata = resolveChatMetadata(
      chat: chat,
      localUserUUID: localUserUUID,
      users: users,
      l10n: l10n,
    );

    final isDM = chat.type == 'DM';
    final isForum = chat.type == 'FORUM';
    final tab = _effectiveTab(isDM);

    final rawSub = widget.subID;
    final subExists = chat.subs.isEmpty
        ? rawSub == 0
        : chat.subs.any((s) => (s['id'] as num?)?.toInt() == rawSub);
    final resolvedSub = subExists ? rawSub : 0;
    final effectiveSub = resolvedSub;
    if (resolvedSub != rawSub) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ref.read(activeChatProvider.notifier).setSelectedSub(resolvedSub);
        final target = chatOverviewPath(widget.chatUUID, resolvedSub);
        if (GoRouterState.of(context).uri.path != target) {
          context.replace(target);
        }
      });
    }

    _ensureMessagesLoaded(chat, effectiveSub);

    List<MessageModel> scopedMessages = [];
    for (final subID in _scopeSubIDs(chat, effectiveSub)) {
      final state = ref.watch(
        chatMessagesProvider((chatUUID: widget.chatUUID, subID: subID)),
      );
      scopedMessages.addAll(state.messages);
    }
    scopedMessages.sort((a, b) => b.createdAt.compareTo(a.createdAt));

    final availableTabs = isDM
        ? _OverviewTab.values.where((t) => t != _OverviewTab.members).toList()
        : _OverviewTab.values.toList();

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedArrowLeft01),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Text(
          isDM ? metadata.name : l10n.overviewTitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _HeaderBlock(
              chat: chat,
              metadata: metadata,
              isDM: isDM,
              localUserUUID: localUserUUID,
              users: users,
            ),
            if (isDM)
              _DmInfoCard(
                chat: chat,
                metadata: metadata,
                localUserUUID: localUserUUID,
                users: users,
              ),
            if (isForum)
              _SubSection(
                chat: chat,
                effectiveSub: effectiveSub,
                onSelect: (id) {
                  ref.read(activeChatProvider.notifier).setSelectedSub(id);
                  final target = chatOverviewPath(widget.chatUUID, id);
                  if (GoRouterState.of(context).uri.path != target) {
                    context.replace(target);
                  }
                },
              ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final t in availableTabs)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        selected: tab == t,
                        label: Text(_tabLabel(t, l10n)),
                        onSelected: (_) => setState(() => _tab = t),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            if (isForum && tab != _OverviewTab.members)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  l10n.overviewSharedInSub(
                    _subName(chat, effectiveSub),
                  ),
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            if (tab == _OverviewTab.members && !isDM)
              _MembersList(chat: chat, users: users)
            else
              _TabContent(
                tab: tab,
                messages: scopedMessages,
                chatUUID: widget.chatUUID,
              ),
            const SizedBox(height: 16),
            _ActionsCard(chatUUID: widget.chatUUID),
          ],
        ),
      ),
    );
  }

  String _tabLabel(_OverviewTab tab, AppLocalizations l10n) {
    return switch (tab) {
      _OverviewTab.members => l10n.overviewMembers,
      _OverviewTab.media => l10n.overviewMedia,
      _OverviewTab.files => l10n.overviewFiles,
      _OverviewTab.links => l10n.overviewLinks,
      _OverviewTab.music => l10n.overviewMusic,
      _OverviewTab.voice => l10n.overviewVoice,
      _OverviewTab.gifs => l10n.overviewGifs,
    };
  }

  String _subName(ChatModel chat, int subID) {
    for (final s in chat.subs) {
      if ((s['id'] as num).toInt() == subID) {
        final name = s['name']?.toString().trim();
        if (name != null && name.isNotEmpty) return name;
        return 'Sub $subID';
      }
    }
    return 'Sub $subID';
  }
}

class _FileEntry {
  final Map<String, dynamic> file;
  final DateTime createdAt;

  const _FileEntry({required this.file, required this.createdAt});
}

List<_FileEntry> _collectFiles(List<MessageModel> messages) {
  final out = <_FileEntry>[];
  for (final m in messages) {
    for (final f in m.files) {
      out.add(_FileEntry(file: f, createdAt: m.createdAt));
    }
  }
  out.sort((a, b) => b.createdAt.compareTo(a.createdAt));
  return out;
}

FileTypeCategory _categoryOf(Map<String, dynamic> file) {
  final mime = getMimeType(file);
  final name = (file['name'] ?? file['fileName'] ?? '').toString();
  return getFileType(mime, name);
}

bool _isGifFile(Map<String, dynamic> file) {
  final name = (file['name'] ?? file['fileName'] ?? '').toString().toLowerCase();
  if (name.endsWith('.gif')) return true;
  final mime = getMimeType(file).toLowerCase();
  return mime == 'image/gif';
}

final _urlRegex = RegExp(r'https?://[^\s<>"`]+');

List<({String url, MessageModel message})> _collectLinks(
  List<MessageModel> messages,
) {
  final out = <({String url, MessageModel message})>[];
  final seen = <String>{};
  for (final m in messages) {
    final content = m.content;
    if (content == null || content.isEmpty) continue;
    for (final match in _urlRegex.allMatches(content)) {
      var url = match.group(0) ?? '';
      url = url.replaceAll(RegExp(r'[),.;!?]+$'), '');
      if (url.isEmpty || !seen.add(url)) continue;
      out.add((url: url, message: m));
    }
  }
  return out;
}

List<({String url, MessageModel message})> _collectGifLinks(
  List<MessageModel> messages,
) {
  final out = <({String url, MessageModel message})>[];
  final seen = <String>{};
  for (final m in messages) {
    for (final url in extractGifUrls(m.content)) {
      if (!seen.add(url)) continue;
      out.add((url: url, message: m));
    }
  }
  return out;
}

String _formatBytes(dynamic size) {
  final bytes = size is num ? size.toDouble() : double.tryParse('$size') ?? 0;
  if (bytes <= 0) return '';
  if (bytes < 1024) return '${bytes.toStringAsFixed(0)} B';
  if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
  if (bytes < 1024 * 1024 * 1024) {
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
  return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
}

class _HeaderBlock extends StatelessWidget {
  const _HeaderBlock({
    required this.chat,
    required this.metadata,
    required this.isDM,
    required this.localUserUUID,
    required this.users,
  });

  final ChatModel chat;
  final ResolvedChatMetadata metadata;
  final bool isDM;
  final String localUserUUID;
  final Map<String, UserModel> users;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final subtitle = isDM
        ? (metadata.isSavedMessages
              ? ''
              : (metadata.isOnline ? l10n.online : l10n.offline))
        : l10n.membersCount(chat.members.length);

    return Column(
      children: [
        Avatar(
          uuid: metadata.profilePictureUUID,
          name: metadata.name,
          seedKey: chat.uuid,
          size: 104,
          isOnline: metadata.isOnline,
          isSavedMessages: metadata.isSavedMessages,
          type: chat.type,
        ),
        const SizedBox(height: 12),
        Text(
          metadata.name,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
        ),
        if (subtitle.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 13,
              color: isDM && metadata.isOnline && !metadata.isSavedMessages
                  ? colorScheme.primary
                  : colorScheme.onSurfaceVariant,
            ),
          ),
        ],
        const SizedBox(height: 16),
      ],
    );
  }
}

class _DmInfoCard extends StatelessWidget {
  const _DmInfoCard({
    required this.chat,
    required this.metadata,
    required this.localUserUUID,
    required this.users,
  });

  final ChatModel chat;
  final ResolvedChatMetadata metadata;
  final String localUserUUID;
  final Map<String, UserModel> users;

  UserModel? _dmUser() {
    if (metadata.otherUserUUID != null) return users[metadata.otherUserUUID];
    for (final m in chat.members) {
      final uuid = (m['uuid'] ?? m['userUUID'])?.toString();
      if (uuid != null && uuid != localUserUUID) {
        final user = users[uuid];
        if (user != null) return user;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final dmUser = _dmUser();
    if (dmUser == null && metadata.isSavedMessages) {
      return const SizedBox.shrink();
    }
    final handle = dmUser?.handle;
    final bio = dmUser?.biography;

    Widget row({
      required IconData icon,
      required String title,
      required String value,
    }) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: colorScheme.primary.withValues(alpha: 0.12),
              ),
              child: Icon(icon, size: 18, color: colorScheme.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          row(
            icon: Icons.person_outline,
            title: l10n.overviewUsername,
            value: handle != null && handle.isNotEmpty
                ? '@$handle'
                : l10n.overviewNotSpecified,
          ),
          Divider(height: 1, color: colorScheme.outline.withValues(alpha: 0.2)),
          row(
            icon: Icons.info_outline,
            title: l10n.overviewBiography,
            value: bio != null && bio.trim().isNotEmpty
                ? bio.trim()
                : l10n.overviewNoDescription,
          ),
        ],
      ),
    );
  }
}

class _SubSection extends StatelessWidget {
  const _SubSection({
    required this.chat,
    required this.effectiveSub,
    required this.onSelect,
  });

  final ChatModel chat;
  final int effectiveSub;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    if (chat.subs.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
            child: Text(
              l10n.overviewSubChannels,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
          ),
          for (var i = 0; i < chat.subs.length; i++) ...[
            _SubRow(
              sub: chat.subs[i],
              isActive: (chat.subs[i]['id'] as num).toInt() == effectiveSub,
              onTap: () =>
                  onSelect((chat.subs[i]['id'] as num).toInt()),
            ),
            if (i != chat.subs.length - 1)
              Divider(
                height: 1,
                indent: 16,
                endIndent: 16,
                color: colorScheme.outline.withValues(alpha: 0.15),
              ),
          ],
          const SizedBox(height: 6),
        ],
      ),
    );
  }
}

class _SubRow extends StatelessWidget {
  const _SubRow({required this.sub, required this.isActive, required this.onTap});

  final Map<String, dynamic> sub;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final rawName = sub['name']?.toString().trim() ?? '';
    final id = (sub['id'] as num).toInt();
    final name = rawName.isNotEmpty ? rawName : 'Sub $id';
    final type = (sub['type']?.toString() ?? '').toUpperCase();

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isActive
                    ? colorScheme.primary
                    : colorScheme.surfaceContainerHighest,
              ),
              child: Text(
                name.isNotEmpty ? name[0].toUpperCase() : '#',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isActive
                      ? colorScheme.onPrimary
                      : colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                  if (type.isNotEmpty)
                    Text(
                      type,
                      style: TextStyle(
                        fontSize: 11,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
            ),
            if (isActive)
              Icon(Icons.check_circle, size: 20, color: colorScheme.primary)
            else
              Icon(
                Icons.chevron_right,
                size: 20,
                color: colorScheme.onSurfaceVariant,
              ),
          ],
        ),
      ),
    );
  }
}

class _MembersList extends StatelessWidget {
  const _MembersList({required this.chat, required this.users});

  final ChatModel chat;
  final Map<String, UserModel> users;

  List<Map<String, dynamic>> _resolvedRoles(Map<String, dynamic> member) {
    final rawIds =
        member['roleIDs'] ?? member['role_ids'] ?? member['roleIds'] ?? [2];
    final ids = rawIds is List ? rawIds : [rawIds];
    return chat.roles.where((r) {
      return ids.any((id) => '$id' == '${r['id']}');
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    if (chat.members.isEmpty) {
      return _EmptyState(icon: Icons.people_outline, text: l10n.overviewNoMembers);
    }

    return Column(
      children: [
        for (var i = 0; i < chat.members.length; i++) ...[
          _MemberRow(
            member: chat.members[i],
            users: users,
            roles: _resolvedRoles(chat.members[i]),
          ),
          if (i != chat.members.length - 1)
            Divider(
              height: 1,
              indent: 60,
              color: colorScheme.outline.withValues(alpha: 0.15),
            ),
        ],
      ],
    );
  }
}

class _MemberRow extends StatelessWidget {
  const _MemberRow({
    required this.member,
    required this.users,
    required this.roles,
  });

  final Map<String, dynamic> member;
  final Map<String, UserModel> users;
  final List<Map<String, dynamic>> roles;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final uuid = (member['uuid'] ?? member['userUUID'])?.toString();
    final user = uuid != null ? users[uuid] : null;
    final name = user?.displayName.trim().isNotEmpty == true
        ? user!.displayName.trim()
        : ((member['name'] ?? member['handle'] ?? l10n.chatUnknown)?.toString());
    final isOnline =
        user?.isOnline ?? (member['status']?.toString().toUpperCase() == 'ONLINE');
    final pfp = user?.profilePictureUUID ?? member['profilePictureUUID']?.toString();
    final joinedAt = DateTime.tryParse(member['joinedAt']?.toString() ?? '');

    return InkWell(
      onTap: () => _showMemberDialog(context, user, member),
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Avatar(
              uuid: pfp,
              name: name,
              seedKey: uuid ?? name,
              size: 44,
              isOnline: isOnline,
              type: 'USER',
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name ?? l10n.chatUnknown,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (roles.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        for (final role in roles)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Theme.of(
                                context,
                              ).colorScheme.primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              (role['name'] ?? 'Role').toString(),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            if (joinedAt != null)
              Text(
                DateFormat.yMMMMd().format(joinedAt.toLocal()),
                style: TextStyle(
                  fontSize: 11,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _showMemberDialog(
    BuildContext context,
    UserModel? user,
    Map<String, dynamic> member,
  ) {
    final l10n = AppLocalizations.of(context)!;
    final uuid = (member['uuid'] ?? member['userUUID'])?.toString() ?? '';
    final name = user?.displayName ?? member['name']?.toString() ?? l10n.chatUnknown;
    final handle = user?.handle ?? member['handle']?.toString();
    final bio = user?.biography ?? member['biography']?.toString();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Avatar(
              uuid: user?.profilePictureUUID,
              name: name,
              seedKey: uuid.isNotEmpty ? uuid : name,
              size: 64,
              isOnline: user?.isOnline == true,
              type: 'USER',
            ),
            const SizedBox(height: 12),
            Text(
              name,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            if (handle != null && handle.isNotEmpty)
              Text(
                '@$handle',
                style: TextStyle(
                  color: Theme.of(ctx).colorScheme.onSurfaceVariant,
                ),
              ),
            if (bio != null && bio.trim().isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(bio.trim(), textAlign: TextAlign.center),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(l10n.cancel),
          ),
        ],
      ),
    );
  }
}

class _TabContent extends StatelessWidget {
  const _TabContent({
    required this.tab,
    required this.messages,
    required this.chatUUID,
  });

  final _OverviewTab tab;
  final List<MessageModel> messages;
  final String chatUUID;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    if (tab == _OverviewTab.links) {
      final links = _collectLinks(messages);
      if (links.isEmpty) {
        return _EmptyState(icon: Icons.link, text: l10n.overviewNoLinks);
      }
      return Column(
        children: [
          for (final item in links)
            _LinkRow(url: item.url, message: item.message),
        ],
      );
    }

    if (tab == _OverviewTab.gifs) {
      final gifLinks = _collectGifLinks(messages);
      final gifFiles = _collectFiles(
        messages,
      ).where((e) => _isGifFile(e.file)).toList();
      if (gifLinks.isEmpty && gifFiles.isEmpty) {
        return _EmptyState(
          icon: Icons.gif_box_outlined,
          text: l10n.overviewNoGifs,
        );
      }
      return Column(
        children: [
          for (final item in gifLinks) _LinkRow(url: item.url, message: item.message),
          for (final entry in gifFiles)
            _FileRow(entry: entry, chatUUID: chatUUID),
        ],
      );
    }

    final files = _collectFiles(messages);
    final filtered = files.where((e) {
      final category = _categoryOf(e.file);
      return switch (tab) {
        _OverviewTab.media =>
          (category == FileTypeCategory.image ||
                  category == FileTypeCategory.video) &&
              !_isGifFile(e.file),
        _OverviewTab.files => true,
        _OverviewTab.music => category == FileTypeCategory.audio,
        _OverviewTab.voice => category == FileTypeCategory.voice,
        _ => true,
      };
    }).toList();

    if (filtered.isEmpty) {
      return _EmptyState(
        icon: switch (tab) {
          _OverviewTab.media => Icons.image_outlined,
          _OverviewTab.music => Icons.music_note_outlined,
          _OverviewTab.voice => Icons.mic_outlined,
          _ => Icons.folder_outlined,
        },
        text: switch (tab) {
          _OverviewTab.media => l10n.overviewNoMedia,
          _OverviewTab.music => l10n.overviewNoMusic,
          _OverviewTab.voice => l10n.overviewNoVoice,
          _ => l10n.overviewNoFiles,
        },
      );
    }

    return Column(
      children: [
        for (final entry in filtered) _FileRow(entry: entry, chatUUID: chatUUID),
      ],
    );
  }
}

class _FileRow extends StatelessWidget {
  const _FileRow({required this.entry, required this.chatUUID});

  final _FileEntry entry;
  final String chatUUID;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;
    final file = entry.file;
    final name = (file['name'] ?? file['fileName'] ?? l10n.overviewUnknownFile)
        .toString();
    final mime = getMimeType(file);
    final icon = fileIconForMime(mime);
    final iconColor = fileIconColorForMime(mime, colorScheme);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.15)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: AppHugeIcon(icon: icon, color: iconColor, size: 20),
        ),
        title: Text(
          name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Text(
          _formatBytes(file['size']),
          style: TextStyle(fontSize: 12, color: colorScheme.onSurfaceVariant),
        ),
        trailing: IconButton(
          icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedDownload01),
          onPressed: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(l10n.overviewWip)),
            );
          },
        ),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(l10n.overviewWip)),
          );
        },
      ),
    );
  }
}

class _LinkRow extends StatelessWidget {
  const _LinkRow({required this.url, required this.message});

  final String url;
  final MessageModel message;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final preview = (message.content ?? url).trim();
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.15)),
      ),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: colorScheme.primary.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(Icons.link, color: colorScheme.primary, size: 20),
        ),
        title: Text(
          url,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        ),
        subtitle: preview != url
            ? Text(
                preview,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12),
              )
            : null,
        trailing: const Icon(Icons.open_in_new, size: 18),
        onTap: () async {
          final uri = Uri.tryParse(url);
          if (uri == null) return;
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        },
        onLongPress: () async {
          await Clipboard.setData(ClipboardData(text: url));
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(AppLocalizations.of(context)!.copy)),
            );
          }
        },
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        children: [
          Icon(icon, size: 44, color: colorScheme.onSurfaceVariant),
          const SizedBox(height: 8),
          Text(
            text,
            style: TextStyle(fontSize: 13, color: colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _ActionsCard extends StatelessWidget {
  const _ActionsCard({required this.chatUUID});

  final String chatUUID;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colorScheme = Theme.of(context).colorScheme;

    Widget row({
      required IconData icon,
      required String label,
      required VoidCallback onTap,
      bool danger = false,
    }) {
      final fg = danger ? colorScheme.error : colorScheme.onSurface;
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(
            children: [
              Icon(icon, size: 20, color: fg),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: fg,
                  ),
                ),
              ),
              Icon(
                Icons.chevron_right,
                size: 18,
                color: colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      );
    }

    void wip() {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.overviewWip)));
    }

    Future<void> confirmLeave() async {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(l10n.overviewLeaveConfirmTitle),
          content: Text(l10n.overviewLeaveConfirmMessage),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: Text(l10n.cancel),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: Theme.of(ctx).colorScheme.error,
              ),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: Text(l10n.overviewLeave),
            ),
          ],
        ),
      );
      if (confirmed == true && context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.overviewWip)));
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          row(icon: Icons.settings_outlined, label: l10n.overviewSettings, onTap: wip),
          Divider(
            height: 1,
            indent: 12,
            endIndent: 12,
            color: colorScheme.outline.withValues(alpha: 0.15),
          ),
          row(
            icon: Icons.star_border,
            label: l10n.overviewFavouriteMessages,
            onTap: wip,
          ),
          Divider(
            height: 1,
            indent: 12,
            endIndent: 12,
            color: colorScheme.outline.withValues(alpha: 0.15),
          ),
          row(
            icon: Icons.logout,
            label: l10n.overviewLeave,
            danger: true,
            onTap: confirmLeave,
          ),
        ],
      ),
    );
  }
}
