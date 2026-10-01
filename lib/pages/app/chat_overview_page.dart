import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/router/chat_routes.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';
import 'package:novyse/ui/components/chat/chat_overview/chat_overview_app_bar.dart';
import 'package:novyse/ui/components/chat/chat_overview/overview_actions.dart';
import 'package:novyse/ui/components/chat/chat_overview/overview_content.dart';
import 'package:novyse/ui/components/chat/chat_overview/overview_header.dart';
import 'package:novyse/ui/components/chat/chat_overview/overview_members.dart';
import 'package:novyse/ui/components/chat/chat_overview/overview_subs.dart';
import 'package:novyse/ui/components/chat/chat_overview/overview_tab.dart';

export 'package:novyse/ui/components/chat/chat_overview/overview_actions.dart';
export 'package:novyse/ui/components/chat/chat_overview/overview_collectors.dart';
export 'package:novyse/ui/components/chat/chat_overview/overview_content.dart';
export 'package:novyse/ui/components/chat/chat_overview/overview_header.dart';
export 'package:novyse/ui/components/chat/chat_overview/overview_members.dart';
export 'package:novyse/ui/components/chat/chat_overview/overview_rows.dart';
export 'package:novyse/ui/components/chat/chat_overview/overview_subs.dart';
export 'package:novyse/ui/components/chat/chat_overview/overview_tab.dart';

class ChatOverviewPage extends ConsumerStatefulWidget {
  const ChatOverviewPage({
    super.key,
    required this.chatUUID,
    required this.subID,
  });

  final String chatUUID;
  final int subID;

  @override
  ConsumerState<ChatOverviewPage> createState() => _ChatOverviewPageState();
}

class _ChatOverviewPageState extends ConsumerState<ChatOverviewPage> {
  OverviewTab? _tab;

  OverviewTab _effectiveTab(bool isDM) {
    if (_tab != null) {
      if (isDM && _tab == OverviewTab.members) return OverviewTab.media;
      return _tab!;
    }
    return isDM ? OverviewTab.media : OverviewTab.members;
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
                chatMessagesProvider((chatUUID: widget.chatUUID, subID: subID))
                    .notifier,
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
      final topInset = MediaQuery.paddingOf(context).top;
      return Scaffold(
        extendBodyBehindAppBar: true,
        body: Stack(
          children: [
            Padding(
              padding: EdgeInsets.only(top: topInset + 74),
              child: Center(
                child: Text(l10n.chatNotFoundWithId(widget.chatUUID)),
              ),
            ),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: AnnotatedRegion<SystemUiOverlayStyle>(
                value: colorScheme.brightness == Brightness.dark
                    ? SystemUiOverlayStyle.light
                    : SystemUiOverlayStyle.dark,
                child: ChatOverviewAppBar(
                  title: l10n.chatNotFound,
                  subtitle: '',
                  subtitleHighlighted: false,
                  avatarUuid: null,
                  seedKey: widget.chatUUID,
                  isOnline: false,
                  isSavedMessages: false,
                  chatType: null,
                  onBack: () => Navigator.of(context).maybePop(),
                ),
              ),
            ),
          ],
        ),
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
    final resolvedSub = resolveChatSub(subs: chat.subs, requestedSub: rawSub);
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
        ? OverviewTab.values.where((t) => t != OverviewTab.members).toList()
        : OverviewTab.values.toList();

    final topInset = MediaQuery.paddingOf(context).top;
    final String appBarSubtitle;
    if (metadata.isSavedMessages) {
      appBarSubtitle = '';
    } else if (isDM) {
      appBarSubtitle = metadata.isOnline ? l10n.online : l10n.offline;
    } else {
      appBarSubtitle = l10n.membersCount(chat.members.length);
    }
    final appBarSubtitleHighlighted =
        isDM && metadata.isOnline && !metadata.isSavedMessages;

    return Scaffold(
      extendBodyBehindAppBar: true,
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(16, topInset + 74 + 12, 16, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                OverviewHeaderBlock(
                  chat: chat,
                  metadata: metadata,
                  isDM: isDM,
                  localUserUUID: localUserUUID,
                  users: users,
                ),
                if (isDM)
                  OverviewDmInfoCard(
                    chat: chat,
                    metadata: metadata,
                    localUserUUID: localUserUUID,
                    users: users,
                  ),
                if (isForum)
                  OverviewSubSection(
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
                if (isForum && tab != OverviewTab.members)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      l10n.overviewSharedInSub(
                        _subName(
                          chat,
                          effectiveSub,
                          l10n.subFallback(effectiveSub),
                        ),
                      ),
                      style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                if (tab == OverviewTab.members && !isDM)
                  OverviewMembersList(chat: chat, users: users)
                else
                  OverviewTabContent(
                    tab: tab,
                    messages: scopedMessages,
                    chatUUID: widget.chatUUID,
                  ),
                const SizedBox(height: 16),
                OverviewActionsCard(
                  chatUUID: widget.chatUUID,
                  subID: effectiveSub,
                ),
              ],
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: AnnotatedRegion<SystemUiOverlayStyle>(
              value: colorScheme.brightness == Brightness.dark
                  ? SystemUiOverlayStyle.light
                  : SystemUiOverlayStyle.dark,
              child: ChatOverviewAppBar(
                title: metadata.name,
                subtitle: appBarSubtitle,
                subtitleHighlighted: appBarSubtitleHighlighted,
                avatarUuid: metadata.profilePictureUUID,
                seedKey: widget.chatUUID,
                isOnline: metadata.isOnline,
                isSavedMessages: metadata.isSavedMessages,
                chatType: chat.type,
                onBack: () => Navigator.of(context).maybePop(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _tabLabel(OverviewTab tab, AppLocalizations l10n) {
    return switch (tab) {
      OverviewTab.members => l10n.overviewMembers,
      OverviewTab.media => l10n.overviewMedia,
      OverviewTab.files => l10n.overviewFiles,
      OverviewTab.links => l10n.overviewLinks,
      OverviewTab.music => l10n.overviewMusic,
      OverviewTab.voice => l10n.overviewVoice,
      OverviewTab.gifs => l10n.overviewGifs,
    };
  }

  String _subName(ChatModel chat, int subID, String fallback) {
    for (final s in chat.subs) {
      if ((s['id'] as num).toInt() == subID) {
        final name = s['name']?.toString().trim();
        if (name != null && name.isNotEmpty) return name;
        return fallback;
      }
    }
    return fallback;
  }
}
