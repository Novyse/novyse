import 'dart:io' as io;

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:photo_view/photo_view.dart';

import 'package:novyse/core/chat/message_file.dart';
import 'package:novyse/core/storage/file/uri_resolver.dart';
import 'package:novyse/core/stores/message_store.dart';

class ChatMediaItem {
  const ChatMediaItem({
    required this.id,
    this.fileRef,
    this.fileUUID,
    this.isVideo = false,
    this.mimeType,
  });

  final String id;
  final String? fileRef;
  final String? fileUUID;
  final bool isVideo;
  final String? mimeType;
}

List<ChatMediaItem> collectChatMedia(List<MessageModel> messages) {
  final sorted = List<MessageModel>.from(messages)
    ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
  final items = <ChatMediaItem>[];
  for (final message in sorted) {
    for (final raw in message.files) {
      final file = MessageFile.fromMap(Map<String, dynamic>.from(raw));
      if (file.isImage) {
        items.add(
          ChatMediaItem(
            id: file.uuid,
            fileRef: file.playableUri ?? file.ref,
            fileUUID: file.uuid,
            mimeType: file.mimeType,
          ),
        );
      } else if (file.isVideo) {
        items.add(
          ChatMediaItem(
            id: file.uuid,
            fileRef: file.playableUri ?? file.ref,
            fileUUID: file.uuid,
            isVideo: true,
            mimeType: file.mimeType,
          ),
        );
      }
    }
  }
  return items;
}

Future<void> showChatMediaViewer(
  BuildContext context, {
  required String chatUUID,
  String? initialFileUUID,
  String? initialUrl,
  List<ChatMediaItem>? items,
}) {
  return Navigator.of(context, rootNavigator: true).push(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => ChatMediaViewerPage(
        chatUUID: chatUUID,
        initialFileUUID: initialFileUUID,
        initialUrl: initialUrl,
        items: items,
      ),
    ),
  );
}

class ChatMediaViewerPage extends ConsumerStatefulWidget {
  const ChatMediaViewerPage({
    super.key,
    required this.chatUUID,
    this.initialFileUUID,
    this.initialUrl,
    this.items,
  });

  final String chatUUID;
  final String? initialFileUUID;
  final String? initialUrl;
  final List<ChatMediaItem>? items;

  @override
  ConsumerState<ChatMediaViewerPage> createState() =>
      _ChatMediaViewerPageState();
}

class _ChatMediaViewerPageState extends ConsumerState<ChatMediaViewerPage> {
  PageController? _controller;
  int _index = 0;
  bool _ready = false;

  String? get _initialId => widget.initialFileUUID ?? widget.initialUrl;

  void _ensureController(List<ChatMediaItem> items) {
    if (items.isEmpty) return;
    var start = 0;
    final initialId = _initialId;
    if (initialId != null) {
      final found = items.indexWhere((e) => e.id == initialId);
      if (found >= 0) start = found;
    }
    if (_controller == null) {
      _controller = PageController(initialPage: start);
      _index = start;
      _ready = true;
    } else if (_index >= items.length) {
      _index = items.length - 1;
    }
  }

  void _go(int delta, int length) {
    final c = _controller;
    if (c == null || length <= 1) return;
    final next = (_index + delta).clamp(0, length - 1);
    if (next == _index) return;
    c.animateToPage(
      next,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messages = ref.watch(
      chatMessagesProvider((chatUUID: widget.chatUUID, subID: 0)).select(
        (s) => s.messages,
      ),
    );
    final items = widget.items ?? collectChatMedia(messages);
    _ensureController(items);

    final wide = MediaQuery.sizeOf(context).width >= 720;

    return CallbackShortcuts(
      bindings: {
        const SingleActivator(LogicalKeyboardKey.arrowLeft): () =>
            _go(-1, items.length),
        const SingleActivator(LogicalKeyboardKey.arrowRight): () =>
            _go(1, items.length),
        const SingleActivator(LogicalKeyboardKey.escape): () =>
            Navigator.of(context).maybePop(),
      },
      child: Focus(
        autofocus: true,
        child: Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.black,
            iconTheme: const IconThemeData(color: Colors.white),
            title: Text(
              items.isEmpty ? '' : '${_index + 1} / ${items.length}',
              style: const TextStyle(color: Colors.white, fontSize: 15),
            ),
            elevation: 0,
          ),
          body: items.isEmpty
              ? const Center(
                  child: Text(
                    'Nessun media',
                    style: TextStyle(color: Colors.white70),
                  ),
                )
              : Stack(
                  children: [
                    PageView.builder(
                      controller: _controller,
                      itemCount: items.length,
                      onPageChanged: (i) => setState(() => _index = i),
                      itemBuilder: (context, i) {
                        final item = items[i];
                        return _ViewerPage(
                          item: item,
                          active: _ready && i == _index,
                        );
                      },
                    ),
                    if (wide && items.length > 1) ...[
                      Positioned(
                        left: 8,
                        top: 0,
                        bottom: 0,
                        child: Center(
                          child: _NavButton(
                            icon: Icons.chevron_left,
                            onTap: () => _go(-1, items.length),
                          ),
                        ),
                      ),
                      Positioned(
                        right: 8,
                        top: 0,
                        bottom: 0,
                        child: Center(
                          child: _NavButton(
                            icon: Icons.chevron_right,
                            onTap: () => _go(1, items.length),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black45,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, color: Colors.white, size: 32),
        ),
      ),
    );
  }
}

class _ViewerPage extends StatelessWidget {
  const _ViewerPage({required this.item, required this.active});

  final ChatMediaItem item;
  final bool active;

  @override
  Widget build(BuildContext context) {
    if (item.isVideo) {
      return _ViewerVideo(
        key: ValueKey('video-${item.id}'),
        fileRef: item.fileRef,
        fileUUID: item.fileUUID,
        autoplay: active,
      );
    }
    return UriResolver(
      ref: item.fileRef,
      fileUUID: item.fileUUID,
      mimeType: item.mimeType ?? 'image/jpeg',
      autoDownload: true,
      placeholder: const Center(
        child: CircularProgressIndicator(color: Colors.white),
      ),
      builder: (context, resolvedUri) {
        final uri = resolvedUri ?? item.fileRef;
        if (uri == null || uri.isEmpty) {
          return const Center(
            child: Icon(Icons.broken_image, color: Colors.white54, size: 48),
          );
        }
        return PhotoView(
          imageProvider: _imageProviderFor(uri),
          minScale: PhotoViewComputedScale.contained,
          maxScale: PhotoViewComputedScale.covered * 3,
          loadingBuilder: (context, event) => const Center(
            child: CircularProgressIndicator(color: Colors.white),
          ),
        );
      },
    );
  }

  ImageProvider _imageProviderFor(String uri) {
    if (kIsWeb ||
        uri.startsWith('blob:') ||
        uri.startsWith('data:') ||
        uri.startsWith('http://') ||
        uri.startsWith('https://')) {
      return NetworkImage(uri);
    }
    final clean = uri.startsWith('file://')
        ? uri.replaceFirst('file://', '')
        : uri;
    return FileImage(io.File(clean));
  }
}

class _ViewerVideo extends StatefulWidget {
  const _ViewerVideo({
    super.key,
    required this.fileRef,
    required this.fileUUID,
    required this.autoplay,
  });

  final String? fileRef;
  final String? fileUUID;
  final bool autoplay;

  @override
  State<_ViewerVideo> createState() => _ViewerVideoState();
}

class _ViewerVideoState extends State<_ViewerVideo> {
  Player? _player;
  VideoController? _controller;
  String? _openedUri;

  String _toMediaUri(String uri) {
    if (kIsWeb) return uri;
    if (uri.startsWith('http://') ||
        uri.startsWith('https://') ||
        uri.startsWith('blob:') ||
        uri.startsWith('data:')) {
      return uri;
    }
    if (uri.startsWith('file://')) return uri;
    return 'file://$uri';
  }

  @override
  void didUpdateWidget(covariant _ViewerVideo oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.autoplay != widget.autoplay) {
      if (widget.autoplay) {
        _player?.play();
      } else {
        _player?.pause();
      }
    }
  }

  @override
  void dispose() {
    _player?.dispose();
    super.dispose();
  }

  Future<void> _ensureOpen(String uri) async {
    try {
      if (_openedUri == uri && _controller != null) {
        if (widget.autoplay) {
          await _player?.play();
        }
        return;
      }
      _player ??= Player();
      _controller ??= VideoController(_player!);
      if (mounted) setState(() {});
      await _player!.open(Media(_toMediaUri(uri)), play: widget.autoplay);
      if (!mounted) return;
      setState(() => _openedUri = uri);
      if (!widget.autoplay) await _player?.pause();
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return UriResolver(
      ref: widget.fileRef,
      fileUUID: widget.fileUUID,
      mimeType: 'video/mp4',
      autoDownload: true,
      placeholder: const Center(
        child: CircularProgressIndicator(color: Colors.white),
      ),
      builder: (context, resolvedUri) {
        final uri = resolvedUri ?? widget.fileRef;
        if (uri == null || uri.isEmpty) {
          return const Center(
            child: Icon(Icons.videocam_off, color: Colors.white54, size: 48),
          );
        }
        if (_openedUri != uri) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) _ensureOpen(uri);
          });
        } else if (_controller != null && widget.autoplay) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _player?.play();
          });
        }
        final controller = _controller;
        if (controller == null) {
          return const Center(
            child: CircularProgressIndicator(color: Colors.white),
          );
        }
        return Video(controller: controller, controls: AdaptiveVideoControls);
      },
    );
  }
}
