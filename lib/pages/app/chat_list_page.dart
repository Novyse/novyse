import 'dart:async';

import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:novyse/core/chat/chat_search_service.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/router/chat_routes.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_list_app_bar.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_list_aux_bars.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_list_context_menu.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_list_empty_view.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_list_view.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_search.dart';
import 'package:novyse/ui/components/chat/chat_list/chat_search_results.dart';
import 'package:novyse/ui/components/chat/chat_list/incoming_share_banner.dart';
import 'package:novyse/ui/components/chat/create_chat_modal.dart';
import 'package:novyse/ui/components/chat/join_or_create_chat_modal.dart';
import 'package:novyse/ui/components/status/global_status_bar.dart';

import 'adaptive.dart';

const _statusBarPadding = EdgeInsets.only(top: 8);

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

  final Set<String> _selectedChatUUIDs = {};

  bool get _selecting => _selectedChatUUIDs.isNotEmpty;

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
    _selectedChatUUIDs.clear();
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

  void _enterSelection(String chatUUID) {
    if (_searching) return;
    if (chatUUID.isEmpty) return;
    HapticFeedback.mediumImpact();
    setState(() {
      _selectedChatUUIDs.add(chatUUID);
    });
  }

  void _toggleSelection(String chatUUID) {
    if (chatUUID.isEmpty) return;
    setState(() {
      if (_selectedChatUUIDs.contains(chatUUID)) {
        _selectedChatUUIDs.remove(chatUUID);
      } else {
        _selectedChatUUIDs.add(chatUUID);
      }
    });
  }

  void _exitSelection() {
    if (_selectedChatUUIDs.isEmpty) return;
    setState(() {
      _selectedChatUUIDs.clear();
    });
  }

  Future<void> _showChatContextMenu(
    String chatUUID,
    Offset globalPosition,
  ) async {
    if (_selecting) return;
    final chat = ref
        .read(chatListProvider)
        .chats
        .where((candidate) => candidate.uuid == chatUUID)
        .firstOrNull;
    if (chat == null) return;

    await showChatListContextMenu(
      context: context,
      anchor: globalPosition,
      isPinned: chat.isPinned,
      onTogglePin: () => _togglePin(chatUUID),
    );
  }

  Future<void> _togglePin(String chatUUID) async {
    final notifier = ref.read(chatListProvider.notifier);
    final chat = ref
        .read(chatListProvider)
        .chats
        .where((candidate) => candidate.uuid == chatUUID)
        .firstOrNull;
    if (chat == null) return;

    if (chat.isPinned) {
      await notifier.unpinChats([chatUUID]);
    } else {
      await notifier.pinChats([chatUUID]);
    }
  }

  /// Pins the selected chats that are not pinned yet, preserving the selection
  /// order at the top of the pinned list.
  Future<void> _pinSelected() async {
    final selected = List<String>.from(_selectedChatUUIDs);
    final chats = ref.read(chatListProvider).chats;
    final toPin = [
      for (final chatUUID in selected)
        if (chats
                .where((candidate) => candidate.uuid == chatUUID)
                .firstOrNull
                ?.isPinned ==
            false)
          chatUUID,
    ];

    if (toPin.isNotEmpty) {
      await ref.read(chatListProvider.notifier).pinChats(toPin);
    }
    if (mounted) _exitSelection();
  }

  /// True when every selected chat is pinned (unknown chats count as not
  /// pinned), so the selection bar can show a single pin/unpin action.
  bool _allSelectedPinned(List<ChatModel> chats) {
    if (_selectedChatUUIDs.isEmpty) return false;
    return _selectedChatUUIDs.every(
      (chatUUID) =>
          chats
              .where((candidate) => candidate.uuid == chatUUID)
              .firstOrNull
              ?.isPinned ==
          true,
    );
  }

  /// Single selection-bar action: unpins when the whole selection is pinned,
  /// otherwise pins the chats that are not pinned yet.
  Future<void> _togglePinSelected() async {
    if (_allSelectedPinned(ref.read(chatListProvider).chats)) {
      await _unpinSelected();
    } else {
      await _pinSelected();
    }
  }

  /// Unpins the selected chats that are pinned.
  Future<void> _unpinSelected() async {
    final selected = List<String>.from(_selectedChatUUIDs);
    final chats = ref.read(chatListProvider).chats;
    final toUnpin = [
      for (final chatUUID in selected)
        if (chats
                .where((candidate) => candidate.uuid == chatUUID)
                .firstOrNull
                ?.isPinned ==
            true)
          chatUUID,
    ];

    if (toUnpin.isNotEmpty) {
      await ref.read(chatListProvider.notifier).unpinChats(toUnpin);
    }
    if (mounted) _exitSelection();
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

    final allChats = ref.read(chatListProvider).chats;

    final localMatches = filterChatsByQuery(
      chats: allChats,
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
      unawaited(
        searchMessagesByQuery(q)
            .then((results) {
              if (!mounted || token != _searchToken || _query.trim() != q) {
                return;
              }
              setState(() {
                _matchedMessages = results;
                _messagesLoading = false;
              });
            })
            .catchError((_) {
              if (!mounted || token != _searchToken || _query.trim() != q) {
                return;
              }
              setState(() {
                _messagesLoading = false;
              });
            }),
      );
    }

    if (canSearchRemote) {
      unawaited(
        ref
            .read(chatSearchServiceProvider)
            .searchAll(q, l10n)
            .then((remoteResults) {
              if (!mounted || token != _searchToken || _query.trim() != q) {
                return;
              }
              setState(() {
                _remoteChats = filterRemoteChats(
                  local: localMatches,
                  remote: remoteResults,
                );
                _remoteLoading = false;
              });
            })
            .catchError((_) {
              if (!mounted || token != _searchToken || _query.trim() != q) {
                return;
              }
              setState(() {
                _remoteLoading = false;
              });
            }),
      );
    }
  }

  /// Apre una chat: `push` su stretto (il back di sistema torna alla lista
  /// con animazione predittiva), `go` su largo (replace del pannello).
  void _openChatLocation(String target) {
    if (isMasterDetailLayout(context)) {
      context.go(target);
    } else {
      context.push(target);
    }
  }

  void _openChat(String chatUUID) {
    final active = ref.read(activeChatProvider);
    final storedSub = active.selectedChatUUID == chatUUID
        ? active.selectedSub
        : ref.read(chatDraftProvider(chatUUID)).selectedSub;
    final chat = ref
        .read(chatListProvider)
        .chats
        .where((c) => c.uuid == chatUUID)
        .firstOrNull;
    final sub = resolveChatSub(
      subs: chat?.subs ?? const [],
      requestedSub: storedSub,
    );
    final target = chatSubPath(chatUUID, sub);
    if (GoRouterState.of(context).uri.path == target) return;
    ref
        .read(activeChatProvider.notifier)
        .setSelectedChatUUID(chatUUID, subOverride: sub);
    _openChatLocation(target);
  }

  void _onChatSelected(ChatModel chat) {
    final localUUID = resolveLocalChatUUID(
      localChats: ref.read(chatListProvider).chats,
      candidate: chat,
    );
    if (localUUID != null) {
      _openChat(localUUID);
      return;
    }

    showJoinOrCreateChatModal(
      context: context,
      chat: chat,
      onJoined: (chatUUID) {
        // Move the chat from the global section to the local one
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _refreshSearch();
        });
        _openChat(chatUUID);
      },
    );
  }

  /// Recomputes the search sections from the local chat list
  void _refreshSearch() {
    final l10n = AppLocalizations.of(context);
    final query = _query.trim();
    if (l10n == null || query.isEmpty) return;
    final userState = ref.read(userStoreProvider);
    final chats = ref.read(chatListProvider).chats;
    setState(() {
      _localChats = filterChatsByQuery(
        chats: chats,
        query: query,
        localUserUUID: userState.localUserUUID,
        users: userState.users,
        l10n: l10n,
      );
      _remoteChats = filterRemoteChats(local: chats, remote: _remoteChats);
    });
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
    final currentPath = GoRouterState.of(context).uri.path;
    final target = chatSubPath(chatUUID, subID);
    if (currentPath == target) return;
    _openChatLocation(target);
  }

  @override
  Widget build(BuildContext context) {
    final selectedChatUUID = ref.watch(
      activeChatProvider.select((s) => s.selectedChatUUID),
    );
    final chatListState = ref.watch(chatListProvider);
    final chats = chatListState.chats;
    final colorScheme = Theme.of(context).colorScheme;
    final isFiltering = _searching && _query.trim().isNotEmpty;
    final selectedPinned = _allSelectedPinned(chats);

    return PopScope(
      canPop: !_searching && !_selecting,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_selecting) {
          _exitSelection();
        } else if (_searching) {
          _closeSearch();
        }
      },
      child: Scaffold(
        body: CustomScrollView(
          slivers: [
            PinnedHeaderSliver(
              child: AnnotatedRegion<SystemUiOverlayStyle>(
                value: colorScheme.brightness == Brightness.dark
                    ? SystemUiOverlayStyle.light
                    : SystemUiOverlayStyle.dark,
                child: ChatListAppBar(
                  searching: _searching,
                  searchController: _searchController,
                  searchFocusNode: _searchFocusNode,
                  onQueryChanged: _onQueryChanged,
                  onOpenSearch: _openSearch,
                  onCloseSearch: _closeSearch,
                  onNewChat: () => showCreateChatModal(context),
                  selecting: _selecting,
                  selectedCount: _selectedChatUUIDs.length,
                  onCloseSelection: _exitSelection,
                  selectedPinned: selectedPinned,
                  onTogglePinSelected: _togglePinSelected,
                  footer: const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      GlobalStatusBar(padding: _statusBarPadding),
                      ChatListAuxBars(),
                    ],
                  ),
                ),
              ),
            ),
            if (chatListState.loading && chats.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator()),
              )
            else if (!isFiltering && chats.isEmpty) ...[
              const SliverToBoxAdapter(child: IncomingShareBanner()),
              const ChatListEmptyView(),
            ] else ...[
              if (!isFiltering)
                const SliverToBoxAdapter(child: IncomingShareBanner()),
              if (isFiltering)
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
                  selectionMode: _selecting,
                  selectedUUIDs: _selectedChatUUIDs,
                  onToggleSelection: _toggleSelection,
                  onEnterSelection: _enterSelection,
                  onSecondaryTapItem: (chatUUID, position) =>
                      _showChatContextMenu(chatUUID, position),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
