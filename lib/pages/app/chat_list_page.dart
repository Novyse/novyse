import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/pages/app/chat_routes.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_list_app_bar.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_list_empty_view.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_list_view.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_search.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_search_results.dart';
import 'package:novyse/ui/components/chat/create_chat_modal.dart';
import 'package:novyse/ui/components/chat/join_or_create_chat_modal.dart';
import 'package:novyse/ui/components/status/global_status_bar.dart';

const _statusBarPadding = EdgeInsets.symmetric(horizontal: 4, vertical: 4);
const _floatingPillSpacing = 8.0;

class ChatListPage extends ConsumerStatefulWidget {
  const ChatListPage({super.key});

  @override
  ConsumerState<ChatListPage> createState() => _ChatListPageState();
}

class _ChatListPageState extends ConsumerState<ChatListPage> {
  bool _searching = false;
  String _query = '';
  Timer? _debounce;
  int _searchToken = 0;

  List<ChatModel> _localChats = [];
  List<ChatModel> _remoteChats = [];
  List<Map<String, dynamic>> _matchedMessages = [];
  bool _messagesLoading = false;
  bool _remoteLoading = false;

  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _openSearch() {
    setState(() => _searching = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _searchFocusNode.requestFocus();
    });
  }

  void _closeSearch() {
    _debounce?.cancel();
    _searchController.clear();
    _searchFocusNode.unfocus();
    setState(() {
      _searching = false;
      _query = '';
      _localChats = [];
      _remoteChats = [];
      _matchedMessages = [];
      _messagesLoading = false;
      _remoteLoading = false;
    });
  }

  void _onQueryChanged(String value) {
    setState(() => _query = value);
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), _runSearch);
  }

  Future<void> _runSearch() async {
    final q = _query.trim();
    if (q.isEmpty) {
      if (!mounted) return;
      setState(() {
        _localChats = [];
        _remoteChats = [];
        _matchedMessages = [];
        _messagesLoading = false;
        _remoteLoading = false;
      });
      return;
    }

    final l10n = AppLocalizations.of(context);
    if (l10n == null) return;
    final userState = ref.read(userStoreProvider);

    final localMatches = filterChatsByQuery(
      chats: ref.read(chatListProvider).chats,
      query: q,
      localUserUUID: userState.localUserUUID,
      users: userState.users,
      l10n: l10n,
    );

    final searchMessages = q.isNotEmpty;
    final canSearchRemote = q.length >= 3;
    final token = ++_searchToken;

    if (!mounted) return;
    setState(() {
      _localChats = localMatches;
      _remoteChats = [];
      _matchedMessages = [];
      _messagesLoading = searchMessages;
      _remoteLoading = canSearchRemote;
    });

    if (searchMessages) {
      searchMessagesByQuery(q)
          .then((results) {
            if (!mounted || token != _searchToken || _query.trim() != q) return;
            setState(() {
              _matchedMessages = results;
              _messagesLoading = false;
            });
          })
          .catchError((_) {
            if (!mounted || token != _searchToken || _query.trim() != q) return;
            setState(() {
              _messagesLoading = false;
            });
          });
    }

    if (canSearchRemote) {
      searchRemoteChats(q)
          .then((remoteResults) {
            if (!mounted || token != _searchToken || _query.trim() != q) return;
            setState(() {
              _remoteChats = filterRemoteChats(
                local: localMatches,
                remote: remoteResults,
              );
              _remoteLoading = false;
            });
          })
          .catchError((_) {
            if (!mounted || token != _searchToken || _query.trim() != q) return;
            setState(() {
              _remoteLoading = false;
            });
          });
    }
  }

  void _openChat(String chatUUID) {
    final currentUUID = chatUUIDFromPath(GoRouterState.of(context).uri.path);
    if (currentUUID == chatUUID) return;
    ref.read(activeChatProvider.notifier).setSelectedChatUUID(chatUUID);
    context.push('/chats/$chatUUID');
  }

  void _onChatSelected(ChatModel chat) {
    final isLocal = ref
        .read(chatListProvider)
        .chats
        .any((c) => c.uuid == chat.uuid);
    if (isLocal) {
      _openChat(chat.uuid);
    } else {
      showJoinOrCreateChatModal(
        context: context,
        chat: chat,
        onJoined: (chatUUID) => _openChat(chatUUID),
      );
    }
  }

  void _openMessageResult(Map<String, dynamic> result) {
    final chatUUID = result['chatUUID']?.toString() ?? '';
    if (chatUUID.isEmpty) return;
    final subID = int.tryParse(result['subID']?.toString() ?? '0') ?? 0;
    final messageID = result['id']?.toString() ?? '';

    final notifier = ref.read(activeChatProvider.notifier);
    notifier.setSelectedChatUUID(chatUUID, subOverride: subID);
    if (messageID.isNotEmpty) {
      notifier.jumpToMessage(messageID, subID: subID);
      notifier.setMessageHighlight(messageID);
    }
    final currentUUID = chatUUIDFromPath(GoRouterState.of(context).uri.path);
    if (currentUUID == chatUUID) return;
    context.push('/chats/$chatUUID');
  }

  @override
  Widget build(BuildContext context) {
    final selectedChatUUID = ref.watch(
      activeChatProvider.select((s) => s.selectedChatUUID),
    );
    final chatListState = ref.watch(chatListProvider);
    final chats = chatListState.chats;
    final colorScheme = Theme.of(context).colorScheme;
    final topInset = MediaQuery.paddingOf(context).top;
    final isFiltering = _searching && _query.trim().isNotEmpty;

    return PopScope(
      canPop: !_searching,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_searching) _closeSearch();
      },
      child: Scaffold(
        extendBodyBehindAppBar: true,
        body: Stack(
          children: [
            CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: SizedBox(height: topInset + 68)),
                if (chatListState.loading && chats.isEmpty)
                  const SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (!isFiltering && chats.isEmpty)
                  const ChatListEmptyView()
                else if (isFiltering)
                  ChatSearchResults(
                    localChats: _localChats,
                    remoteChats: _remoteChats,
                    matchedMessages: _matchedMessages,
                    messagesLoading: _messagesLoading,
                    remoteLoading: _remoteLoading,
                    query: _query.trim(),
                    selectedChatUUID: selectedChatUUID,
                    onOpenChat: _onChatSelected,
                    onOpenMessage: _openMessageResult,
                  )
                else
                  ChatListView(
                    chats: chats,
                    selectedChatUUID: selectedChatUUID,
                    onOpenChat: _openChat,
                  ),
              ],
            ),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: AnnotatedRegion<SystemUiOverlayStyle>(
                value: colorScheme.brightness == Brightness.dark
                    ? SystemUiOverlayStyle.light
                    : SystemUiOverlayStyle.dark,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ChatListAppBar(
                      searching: _searching,
                      searchController: _searchController,
                      searchFocusNode: _searchFocusNode,
                      onQueryChanged: _onQueryChanged,
                      onOpenSearch: _openSearch,
                      onCloseSearch: _closeSearch,
                      onNewChat: () => showCreateChatModal(context),
                    ),
                    const SizedBox(height: _floatingPillSpacing),
                    const GlobalStatusBar(padding: _statusBarPadding),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
