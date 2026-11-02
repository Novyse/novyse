import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/comms/comms_data_provider.dart';
import 'package:novyse/core/plugins/activity_controller.dart';
import 'package:novyse/core/stores/active_chat_store.dart';
import 'package:novyse/ui/components/comms/comms_bottom_bar.dart';
import 'package:novyse/ui/components/comms/comms_members_layout.dart';

class ChatCallPage extends ConsumerStatefulWidget {
  const ChatCallPage({super.key, required this.chatUUID, required this.subID});

  final String chatUUID;
  final int subID;

  @override
  ConsumerState<ChatCallPage> createState() => _ChatCallPageState();
}

class _ChatCallPageState extends ConsumerState<ChatCallPage> {
  /// Held for the whole life of the page: `dispose` may run after the provider
  /// container is gone, and `ref` must not be touched by then.
  ActivityController? _activities;

  @override
  void initState() {
    super.initState();

    _activities = ref.read(activityControllerProvider.notifier);

    Future.microtask(() {
      if (!mounted) return;
      unawaited(_activities!.join(widget.chatUUID, widget.subID));
    });
  }

  @override
  void didUpdateWidget(ChatCallPage oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.chatUUID == widget.chatUUID &&
        oldWidget.subID == widget.subID) {
      return;
    }

    unawaited(_activities!.join(widget.chatUUID, widget.subID));
  }

  @override
  void dispose() {
    // Leaving the room drops the tiles and the Redis state of this client,
    // which is what makes an activity disappear with the call.
    unawaited(_activities?.leave());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final roomViewData = ref.watch(
      commsDataProvider((chatUUID: widget.chatUUID, sub: widget.subID)),
    );

    final fallbackTop = MediaQuery.paddingOf(context).top + kToolbarHeight + 8;
    final measuredTop =
        ref.watch(activeChatProvider.select((s) => s.headerHeight)) + 12;
    final topPadding = measuredTop > fallbackTop ? measuredTop : fallbackTop;
    const bottomPadding = 90.0;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Member, screen share and activity tiles share the same grid.
          Padding(
            padding: EdgeInsets.only(
              top: topPadding,
              bottom: bottomPadding,
              left: 12,
              right: 12,
            ),
            child: CommsMembersLayout(tiles: roomViewData.tiles),
          ),

          // Floating bottom controls
          CommsBottomBar(chatUUID: widget.chatUUID, sub: widget.subID),
        ],
      ),
    );
  }
}
