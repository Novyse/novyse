import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/core/stores/chat_list_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/pages/app/chat_call_page.dart';
import 'package:novyse/pages/app/chat_routes.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/chat/bottom_bar/chat_bottom_bar.dart';
import 'package:novyse/ui/components/chat/chat_drop_zone.dart';
import 'package:novyse/ui/components/chat/chat_list_item.dart';
import 'package:novyse/ui/components/chat/message_list.dart';
import 'package:novyse/ui/components/huge_icon.dart';

const _appBarEdgePadding = 8.0;

class ChatDetailPage extends ConsumerStatefulWidget {
  const ChatDetailPage({super.key, required this.chatUUID});

  final String chatUUID;

  @override
  ConsumerState<ChatDetailPage> createState() => _ChatDetailPageState();
}

class _ChatDetailPageState extends ConsumerState<ChatDetailPage> {
  bool _callOpen = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref
            .read(activeChatProvider.notifier)
            .setSelectedChatUUID(widget.chatUUID);
      }
    });
  }

  @override
  void didUpdateWidget(covariant ChatDetailPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.chatUUID != widget.chatUUID) {
      _callOpen = false;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          ref
              .read(activeChatProvider.notifier)
              .setSelectedChatUUID(widget.chatUUID);
        }
      });
    }
  }

  void _openCall() {
    if (_callOpen) return;
    setState(() => _callOpen = true);
  }

  void _closeCall() {
    if (!_callOpen) return;
    setState(() => _callOpen = false);
  }

  void _handleBack() {
    if (_callOpen) {
      _closeCall();
      return;
    }
    popOrChats(context);
  }

  @override
  Widget build(BuildContext context) {
    final chatUUID = widget.chatUUID;
    final chat = ref.watch(chatProvider(chatUUID));
    final l10n = AppLocalizations.of(context)!;

    if (chat == null) {
      return Scaffold(
        appBar: AppBar(
          title: Text(l10n.chatTitle),
          leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => popOrChats(context),
            ),
        ),
        body: Center(child: Text(l10n.chatNotFoundWithId(chatUUID))),
      );
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

    final appBar = AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _handleBack,
        ),
      titleSpacing: 0,
      title: Row(
        children: [
          Avatar(
            uuid: metadata.profilePictureUUID,
            name: metadata.name,
            seedKey: chatUUID,
            size: 40,
            isOnline: metadata.isOnline,
            isSavedMessages: metadata.isSavedMessages,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  metadata.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (subtitleText.isNotEmpty)
                  Text(
                    subtitleText,
                    style: TextStyle(
                      fontSize: 12,
                      color: metadata.isOnline
                          ? colorScheme.primary
                          : colorScheme.onSurfaceVariant,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
              ],
            ),
          ),
        ],
      ),
      actionsPadding: const EdgeInsets.only(right: _appBarEdgePadding),
      actions: [
        IconButton(
          icon: AppHugeIcon(
            icon: _callOpen
                ? HugeIcons.strokeRoundedChat01
                : HugeIcons.strokeRoundedAudioWave01,
            color: colorScheme.onSurface,
          ),
          onPressed: _callOpen ? _closeCall : _openCall,
        ),
      ],
    );

    return PopScope(
      canPop: !_callOpen,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _callOpen) {
          _closeCall();
        }
      },
      child: Scaffold(
        body: Stack(
          children: [
            IndexedStack(
              index: _callOpen ? 1 : 0,
              sizing: StackFit.expand,
              children: [
                Column(
                  children: [
                    Expanded(
                      child: ChatDropZone(
                        chatUUID: chatUUID,
                        child: MessageList(chatUUID: chatUUID, subID: 0),
                      ),
                    ),
                    ChatBottomBar(chatUUID: chatUUID, subID: 0),
                  ],
                ),
                ChatCallPage(chatUUID: chatUUID),
              ],
            ),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: ClipRect(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
                  child: ColoredBox(
                    color: colorScheme.surface.withValues(alpha: 0.55),
                    child: appBar,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
