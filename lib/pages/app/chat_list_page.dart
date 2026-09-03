import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_list_app_bar.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_list_empty_view.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_list_view.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_search.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_search_results.dart';
import 'package:novyse/ui/components/chat/create_chat_modal.dart';
import 'package:novyse/ui/components/status/global_status_bar.dart';

const _statusBarPadding = EdgeInsets.symmetric(horizontal: 16, vertical: 4);

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

  List<ChatModel> _matchedChats = [];
  List<Map<String, dynamic>> _matchedMessages = [];
  bool _messagesLoading = false;

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
      _matchedChats = [];
      _matchedMessages = [];
      _messagesLoading = false;
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
        _matchedChats = [];
        _matchedMessages = [];
        _messagesLoading = false;
      });
      return;
    }

    final l10n = AppLocalizations.of(context);
    if (l10n == null) return;
    final userState = ref.read(userStoreProvider);

    final matchedChats = filterChatsByQuery(
      chats: ref.read(chatListProvider).chats,
      query: q,
      localUserUUID: userState.localUserUUID,
      users: userState.users,
      l10n: l10n,
    );

    final searchMessages = q.length >= 1;
    if (!mounted) return;
    setState(() {
      _matchedChats = matchedChats;
      _matchedMessages = [];
      _messagesLoading = searchMessages;
    });
    if (!searchMessages) return;

    final token = ++_searchToken;
    final results = await searchMessagesByQuery(q);
    if (!mounted || token != _searchToken || _query.trim() != q) return;
    setState(() {
      _matchedMessages = results;
      _messagesLoading = false;
    });
  }

  void _openChat(String chatUUID) {
    ref.read(activeChatProvider.notifier).setSelectedChatUUID(chatUUID);
    context.push('/chats/$chatUUID');
  }

  void _openMessageResult(Map<String, dynamic> result) {
    final chatUUID = result['chatUUID']?.toString() ?? '';
    if (chatUUID.isEmpty) return;
    final subID = int.tryParse(result['subID']?.toString() ?? '0') ?? 0;
    final messageID = result['id']?.toString() ?? '';

    final notifier = ref.read(activeChatProvider.notifier);
    notifier.setSelectedChatUUID(chatUUID);
    if (subID != 0) notifier.setSelectedSub(subID);
    if (messageID.isNotEmpty) {
      notifier.setScrollToMessageID(messageID);
      notifier.setMessageHighlight(messageID);
    }
    context.push('/chats/$chatUUID');
  }

  @override
  Widget build(BuildContext context) {
    final selectedChatUUID = ref.watch(
      activeChatProvider.select((s) => s.selectedChatUUID),
    );
    final chatListState = ref.watch(chatListProvider);
    final chats = chatListState.chats;
    final topInset = MediaQuery.paddingOf(context).top;
    final isFiltering = _searching && _query.trim().isNotEmpty;

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: ChatListAppBar(
        searching: _searching,
        searchController: _searchController,
        searchFocusNode: _searchFocusNode,
        onQueryChanged: _onQueryChanged,
        onOpenSearch: _openSearch,
        onCloseSearch: _closeSearch,
        onNewChat: () => showCreateChatModal(context),
      ),
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: SizedBox(height: topInset + kToolbarHeight),
              ),
              const SliverToBoxAdapter(
                child: Visibility(
                  visible: false,
                  maintainSize: true,
                  maintainAnimation: true,
                  maintainState: true,
                  child: GlobalStatusBar(padding: _statusBarPadding),
                ),
              ),
              if (chatListState.loading && chats.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (!isFiltering && chats.isEmpty)
                const ChatListEmptyView()
              else if (isFiltering)
                ChatSearchResults(
                  matchedChats: _matchedChats,
                  matchedMessages: _matchedMessages,
                  messagesLoading: _messagesLoading,
                  query: _query.trim(),
                  selectedChatUUID: selectedChatUUID,
                  onOpenChat: _openChat,
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
            top: topInset + kToolbarHeight,
            left: 0,
            right: 0,
            child: const GlobalStatusBar(padding: _statusBarPadding),
          ),
        ],
      ),
    );
  }
}
