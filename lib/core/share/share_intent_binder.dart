import 'dart:async';

import 'package:flutter/foundation.dart' show debugPrint, kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:novyse/core/router/chat_routes.dart';
import 'package:novyse/core/router/router.dart';
import 'package:novyse/core/share/incoming_share_service.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:receive_sharing_intent/receive_sharing_intent.dart';

/// Listens for OS share intents (Android SEND/SEND_MULTIPLE, iOS Share
/// Extension) and routes the app to the chat list pick-mode.
class ShareIntentBinder extends ConsumerStatefulWidget {
  const ShareIntentBinder({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<ShareIntentBinder> createState() => _ShareIntentBinderState();
}

class _ShareIntentBinderState extends ConsumerState<ShareIntentBinder> {
  StreamSubscription<List<SharedMediaFile>>? _sub;

  @override
  void initState() {
    super.initState();
    if (kIsWeb || currentPlatform != AppPlatform.mobile) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _bootstrap();
    });
  }

  Future<void> _bootstrap() async {
    // Cold start: app launched from a share intent.
    try {
      final initial = await ReceiveSharingIntent.instance.getInitialMedia();
      if (initial.isNotEmpty && mounted) {
        await _handleMedia(initial, coldStart: true);
      }
      await ReceiveSharingIntent.instance.reset();
    } catch (e) {
      debugPrint('[ShareIntent] getInitialMedia failed: $e');
    }
    if (!mounted) return;
    // Warm start: app already running.
    _sub = ReceiveSharingIntent.instance.getMediaStream().listen(
      (media) async {
        if (media.isEmpty || !mounted) return;
        await _handleMedia(media, coldStart: false);
      },
      onError: (Object e) {
        debugPrint('[ShareIntent] stream error: $e');
      },
    );
  }

  Future<void> _handleMedia(
    List<SharedMediaFile> media, {
    required bool coldStart,
  }) async {
    final normalized = await IncomingShareService.normalize(media);
    await ReceiveSharingIntent.instance.reset();
    if (!mounted) return;
    if (normalized.text.trim().isEmpty && normalized.files.isEmpty) return;
    IncomingShareService.storePending(
      ref,
      text: normalized.text,
      files: normalized.files,
    );
    _goToPickMode();
  }

  void _goToPickMode() {
    try {
      final router = ref.read(routerProvider);
      final path = router.state.uri.path;
      // If already inside a chat, go back to the chat list pick-mode.
      if (chatUUIDFromPath(path) != null) {
        final ctx = context;
        while (ctx.canPop()) {
          ctx.pop();
        }
        router.go('/chats');
      } else if (path != '/chats') {
        router.go('/chats');
      }
    } catch (e) {
      debugPrint('[ShareIntent] navigation failed: $e');
    }
  }

  @override
  void dispose() {
    unawaited(_sub?.cancel());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
