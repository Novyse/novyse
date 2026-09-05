import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/comms/comms_data_provider.dart';
import 'package:novyse/ui/components/comms/comms_bottom_bar.dart';
import 'package:novyse/ui/components/comms/comms_members_layout.dart';

class ChatCallPage extends ConsumerWidget {
  const ChatCallPage({
    super.key,
    required this.chatUUID,
    required this.subID,
  });

  final String chatUUID;
  final int subID;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roomViewData = ref.watch(
      commsDataProvider((chatUUID: chatUUID, sub: subID)),
    );

    final topPadding = MediaQuery.paddingOf(context).top + kToolbarHeight + 8;
    const bottomPadding = 90.0;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Member tiles grid
          Padding(
            padding: EdgeInsets.only(
              top: topPadding,
              bottom: bottomPadding,
              left: 12,
              right: 12,
            ),
            child: roomViewData.isLoading && roomViewData.tiles.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : CommsMembersLayout(tiles: roomViewData.tiles),
          ),

          // Floating bottom controls
          CommsBottomBar(
            chatUUID: chatUUID,
            sub: subID,
          ),
        ],
      ),
    );
  }
}
