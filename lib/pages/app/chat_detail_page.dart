import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/chat/permissions.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_draft_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/forward_store.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/pages/app/adaptive.dart';
import 'package:novyse/pages/app/chat_call_page.dart';
import 'package:novyse/pages/app/chat_routes.dart';
import 'package:novyse/ui/components/chat/bottom_bar/chat_bottom_bar.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_detail_app_bar.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_detail_search_app_bar.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_selected_header.dart';
import 'package:novyse/ui/components/chat/chat_detail/chat_sub_header.dart';
import 'package:novyse/ui/components/chat/chat_drop_zone.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';
import 'package:novyse/ui/components/chat/message_list.dart';
import 'package:novyse/ui/components/chat/sub/sub_list.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class ChatDetailPage extends ConsumerStatefulWidget {
  const ChatDetailPage({super.key, required this.chatUUID, required this.subID});

  final String chatUUID;
  final int subID;

  @override
  ConsumerState<ChatDetailPage> createState() => _ChatDetailPageState();
}

class _ChatDetailPageState extends ConsumerState<ChatDetailPage> {
  bool _callOpen = false;
  bool _searching = false;
  bool _isAttachMenuOpen = false;
  bool _isEmojiMenuOpen = false;
  bool _routeSyncPending = false;
  final _searchController = TextEditingController();
  final _searchFocusNode = FocusNode();
  String _searchQuery = '';
  int _searchIndex = 0;
  double _subListWidth = kSubListDefaultWidth;

  @override
  void initState() {
    super.initState();
    _routeSyncPending = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref
            .read(activeChatProvider.notifier)
            .setSelectedChatUUID(widget.chatUUID, subOverride: widget.subID);
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant ChatDetailPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chatUUID != widget.chatUUID) {
      _isAttachMenuOpen = false;
      _isEmojiMenuOpen = false;
      _callOpen = false;
      _closeSearch(resetText: true);
    }
    if (oldWidget.chatUUID != widget.chatUUID ||
        oldWidget.subID != widget.subID) {
      _routeSyncPending = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          ref
              .read(activeChatProvider.notifier)
              .setSelectedChatUUID(widget.chatUUID, subOverride: widget.subID);
        }
      });
    }
  }

  int get _selectedSub =>
      ref.read(activeChatProvider.select((s) => s.selectedSub));

  void _openCall() {
    if (_callOpen) return;
    _closeSearch(resetText: true);
    setState(() => _callOpen = true);
  }

  void _closeCall() {
    if (!_callOpen) return;
    setState(() => _callOpen = false);
  }

  void _openSearch() {
    setState(() => _searching = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _searchFocusNode.requestFocus();
    });
  }

  void _closeSearch({bool resetText = true}) {
    if (!_searching) return;
    setState(() {
      _searching = false;
      _searchQuery = '';
      _searchIndex = 0;
      if (resetText) _searchController.clear();
    });
    _searchFocusNode.unfocus();
  }

  void _onSearchQueryChanged(String value) {
    setState(() {
      _searchQuery = value;
      _searchIndex = 0;
    });
    _jumpToSearchMatch();
  }

  List<MessageModel> _currentSearchMatches() {
    final selectedSub = _selectedSub;
    final messages = ref.read(
      chatMessagesProvider((chatUUID: widget.chatUUID, subID: selectedSub))
          .select((s) => s.messages),
    );
    final trimmedQuery = _searchQuery.trim().toLowerCase();
    if (trimmedQuery.isEmpty) return const [];
    return messages
        .where((m) => (m.content ?? '').toLowerCase().contains(trimmedQuery))
        .toList();
  }

  void _jumpToSearchMatch() {
    if (!_searching) return;
    final matches = _currentSearchMatches();
    if (matches.isEmpty) return;
    final index = _searchIndex.clamp(0, matches.length - 1);
    ref
        .read(activeChatProvider.notifier)
        .jumpToMessage(matches[index].id, subID: _selectedSub);
  }

  void _goToNextResult(int total) {
    if (total == 0) return;
    setState(() => _searchIndex = (_searchIndex - 1 + total) % total);
    _jumpToSearchMatch();
  }

  void _goToPreviousResult(int total) {
    if (total == 0) return;
    setState(() => _searchIndex = (_searchIndex + 1) % total);
    _jumpToSearchMatch();
  }

  void _closeAttachMenu() {
    if (!_isAttachMenuOpen) return;
    setState(() => _isAttachMenuOpen = false);
  }

  void _toggleAttachMenu() {
    setState(() {
      _isAttachMenuOpen = !_isAttachMenuOpen;
      if (_isAttachMenuOpen) _isEmojiMenuOpen = false;
    });
  }

  void _closeEmojiMenu() {
    if (!_isEmojiMenuOpen) return;
    setState(() => _isEmojiMenuOpen = false);
  }

  void _toggleEmojiMenu() {
    final opening = !_isEmojiMenuOpen;
    if (opening) {
      // Mirror legacy: hide keyboard on mobile so the inline panel is visible.
      FocusManager.instance.primaryFocus?.unfocus();
    }
    setState(() {
      _isEmojiMenuOpen = opening;
      if (opening) _isAttachMenuOpen = false;
    });
  }

  void _handleBack() {
    if (_isEmojiMenuOpen) {
      _closeEmojiMenu();
      return;
    }
    if (_isAttachMenuOpen) {
      _closeAttachMenu();
      return;
    }
    final hasSelection = ref
        .read(chatDraftProvider(widget.chatUUID))
        .selectedMessages
        .isNotEmpty;
    if (hasSelection) {
      ref
          .read(chatDraftProvider(widget.chatUUID).notifier)
          .clearSelectedMessages();
      return;
    }
    if (_searching) {
      _closeSearch();
      return;
    }
    if (_callOpen) {
      _closeCall();
      return;
    }
    popOrChats(context);
  }

  List<Map<String, dynamic>> _myRoles(ChatModel chat, String localUserUUID) {
    final myMember = chat.members
        .where((m) => m['uuid'] == localUserUUID)
        .firstOrNull;
    final roleIds = (myMember?['roleIDs'] as List?) ?? const [];
    return chat.roles.where((r) => roleIds.contains(r['id'])).toList();
  }

  @override
  Widget build(BuildContext context) {
    final chatUUID = widget.chatUUID;
    final chat = ref.watch(chatProvider(chatUUID));
    final l10n = AppLocalizations.of(context)!;
    final goRouter = GoRouter.of(context);
    final providerSub = ref.watch(
      activeChatProvider.select((s) => s.selectedSub),
    );
    var selectedSub = _routeSyncPending ? widget.subID : providerSub;

    if (chat == null) {
      return Scaffold(
        appBar: AppBar(
          title: Text(l10n.chatTitle),
          leading: IconButton(
            icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedArrowLeft01),
            onPressed: () => popOrChats(context),
          ),
        ),
        body: Center(child: Text(l10n.chatNotFoundWithId(chatUUID))),
      );
    }

    final subExists = chat.subs.isEmpty
        ? selectedSub == 0
        : chat.subs.any((s) => (s['id'] as num?)?.toInt() == selectedSub);
    if (!subExists) {
      selectedSub = 0;
    }
    if (_routeSyncPending && providerSub == widget.subID) {
      _routeSyncPending = false;
    }
    if (selectedSub != widget.subID) {
      final targetSub = selectedSub;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final target = chatSubPath(chatUUID, targetSub);
        if (goRouter.state.uri.path != target) {
          goRouter.replace(target);
        }
      });
    }

    final colorScheme = Theme.of(context).colorScheme;
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

    String subtitleText;
    if (metadata.isSavedMessages) {
      subtitleText = '';
    } else if (chat.type == 'DM') {
      subtitleText = metadata.isOnline ? l10n.online : l10n.offline;
    } else {
      subtitleText = l10n.membersCount(chat.members.length);
    }

    final messages = ref.watch(
      chatMessagesProvider((chatUUID: chatUUID, subID: selectedSub))
          .select((s) => s.messages),
    );
    final trimmedQuery = _searchQuery.trim();
    final lowerQuery = trimmedQuery.toLowerCase();
    final searchMatches = lowerQuery.isEmpty
        ? const []
        : messages
              .where(
                (m) => (m.content ?? '').toLowerCase().contains(lowerQuery),
              )
              .toList();
    final searchTotal = searchMatches.length;
    final searchIndex = searchTotal == 0
        ? 0
        : _searchIndex.clamp(0, searchTotal - 1);
    final displayIndex = searchTotal == 0 ? 0 : searchTotal - 1 - searchIndex;

    final draftState = ref.watch(chatDraftProvider(chatUUID));
    final selectedMessages = draftState.selectedMessages;
    final hasSelection = selectedMessages.isNotEmpty;

    final forum = chat.type == 'FORUM';
    final wideLayout = isMasterDetailLayout(context);
    final subListCollapsed = !wideLayout || _subListWidth < kSubListExpandThreshold;
    final subListWidth = forum
        ? (wideLayout ? _subListWidth : kSubListCollapsedWidth)
        : 0.0;

    final sub = chat.subs
        .where((s) => s['id'] as int == selectedSub)
        .firstOrNull;
    final subType = sub?['type'] as String?;
    final showComposer =
        subType == 'MIXED' || subType == 'TEXT' || subType == 'ANNOUNCE';
    final canSendMessage = hasPermission(
      _myRoles(chat, localUserUUID),
      ChatPermissions.sendMessage,
      subType,
    );

    // VOCAL -> only vocal UI. TEXT/ANNOUNCE -> only chat. MIXED -> toggle.
    final showViewToggle = subType == null || subType == 'MIXED';
    final showSearch =
        subType == null ||
        subType == 'MIXED' ||
        subType == 'TEXT' ||
        subType == 'ANNOUNCE';
    final showVocal =
        subType == 'VOCAL' || (showViewToggle && _callOpen);

    if (subType == 'VOCAL' && _searching) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _closeSearch();
      });
    }
    if ((subType == 'TEXT' || subType == 'ANNOUNCE') && _callOpen) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _closeCall();
      });
    }

    final Widget floatingBar;

    if (hasSelection) {
      floatingBar = ChatSelectedHeader(
        selectedCount: selectedMessages.length,
        onClose: () {
          ref
              .read(chatDraftProvider(chatUUID).notifier)
              .clearSelectedMessages();
        },
        onReply: () {
          for (final m in selectedMessages) {
            ref.read(chatDraftProvider(chatUUID).notifier).addReply(m);
          }
          ref
              .read(chatDraftProvider(chatUUID).notifier)
              .clearSelectedMessages();
        },
        onForward: () {
          ref
              .read(forwardProvider.notifier)
              .setForwardMessages(selectedMessages);
          ref
              .read(chatDraftProvider(chatUUID).notifier)
              .clearSelectedMessages();
        },
        onDelete: () async {
          for (final m in selectedMessages) {
            try {
              await apiGateway.message.delete(
                chatUUID,
                m.subID,
                m.id.toString(),
              );
            } catch (e) {
              debugPrint('Error deleting message: $e');
            }
            await GlobalEventEmitter.instance.message.update(
              chatUUID,
              m.subID,
              m.id.toString(),
              'delete',
              null,
              {},
            );
          }
          ref
              .read(chatDraftProvider(chatUUID).notifier)
              .clearSelectedMessages();
        },
        bottom: ChatSubHeader(chatUUID: chatUUID),
      );
    } else if (_searching) {
      floatingBar = ChatDetailSearchAppBar(
        controller: _searchController,
        focusNode: _searchFocusNode,
        onQueryChanged: _onSearchQueryChanged,
        onClose: () => _closeSearch(),
        totalResults: searchTotal,
        currentIndex: displayIndex,
        onNext: () => _goToNextResult(searchTotal),
        onPrevious: () => _goToPreviousResult(searchTotal),
        bottom: ChatSubHeader(chatUUID: chatUUID),
      );
    } else {
      floatingBar = ChatDetailAppBar(
        title: metadata.name,
        subtitle: subtitleText,
        subtitleHighlighted: chat.type == 'DM' && metadata.isOnline,
        avatarUuid: metadata.profilePictureUUID,
        seedKey: chatUUID,
        isOnline: metadata.isOnline,
        isSavedMessages: metadata.isSavedMessages,
        chatType: chat.type,
        showVocal: showVocal,
        showSearch: showSearch,
        showViewToggle: showViewToggle,
        onBack: _handleBack,
        onOpenSearch: _openSearch,
        onToggleView: _callOpen ? _closeCall : _openCall,
        onOpenOverview: () =>
            context.push(chatOverviewPath(chatUUID, selectedSub)),
        bottom: ChatSubHeader(chatUUID: chatUUID),
      );
    }

    final messagePane = Column(
      children: [
        Expanded(
          child: ChatDropZone(
            chatUUID: chatUUID,
            child: MessageList(
              chatUUID: chatUUID,
              subID: selectedSub,
              searchQuery: _searching ? trimmedQuery : '',
            ),
          ),
        ),
        if (showComposer)
          ChatBottomBar(
            chatUUID: chatUUID,
            subID: selectedSub,
            readOnly: !canSendMessage,
            isAttachMenuOpen: _isAttachMenuOpen,
            onToggleAttachMenu: _toggleAttachMenu,
            onCloseAttachMenu: _closeAttachMenu,
            isEmojiMenuOpen: _isEmojiMenuOpen,
            onToggleEmojiMenu: _toggleEmojiMenu,
            onCloseEmojiMenu: _closeEmojiMenu,
          ),
      ],
    );

    final contentPane = showVocal
        ? ChatCallPage(chatUUID: chatUUID, subID: selectedSub)
        : messagePane;

    final chatBody = forum
        ? Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SubList(
                chat: chat,
                selectedSub: selectedSub,
                isCollapsed: subListCollapsed,
                width: subListWidth,
                topPadding: 72,
              ),
              if (wideLayout)
                SubListResizeHandle(
                  onDragUpdate: (dx) {
                    setState(() {
                      _subListWidth = (_subListWidth + dx).clamp(
                        kSubListMinWidth,
                        kSubListMaxWidth,
                      );
                    });
                  },
                ),
              Expanded(child: contentPane),
            ],
          )
        : contentPane;

    return PopScope(
      canPop:
          !_callOpen &&
          !_searching &&
          !hasSelection &&
          !_isAttachMenuOpen &&
          !_isEmojiMenuOpen,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_isEmojiMenuOpen) {
          _closeEmojiMenu();
          return;
        }
        if (_isAttachMenuOpen) {
          _closeAttachMenu();
          return;
        }
        if (hasSelection) {
          ref
              .read(chatDraftProvider(chatUUID).notifier)
              .clearSelectedMessages();
          return;
        }
        if (_searching) {
          _closeSearch();
          return;
        }
        if (_callOpen) {
          _closeCall();
        }
      },
      child: Scaffold(
        body: Stack(
          children: [
            chatBody,
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: AnnotatedRegion<SystemUiOverlayStyle>(
                value: colorScheme.brightness == Brightness.dark
                    ? SystemUiOverlayStyle.light
                    : SystemUiOverlayStyle.dark,
                child: floatingBar,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
