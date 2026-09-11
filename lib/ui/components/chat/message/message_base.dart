import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/message_action_methods.dart';
import 'package:novyse/core/chat/message_file.dart';
import 'package:novyse/core/chat/message_format.dart';
import 'package:novyse/core/stores/message_store.dart';
import 'package:novyse/core/stores/user_store.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/chat/message/message_audio.dart';
import 'package:novyse/ui/components/chat/message/message_file.dart';
import 'package:novyse/ui/components/chat/message/message_gif.dart';
import 'package:novyse/ui/components/chat/message/message_image.dart';
import 'package:novyse/ui/components/chat/message/message_reply.dart';
import 'package:novyse/ui/components/chat/message/message_system.dart';
import 'package:novyse/ui/components/chat/message/message_text.dart';
import 'package:novyse/ui/components/chat/message/message_timestamp.dart';
import 'package:novyse/ui/components/chat/message/message_video.dart';
import 'package:novyse/ui/components/chat/message/message_voice.dart';
import 'package:novyse/ui/components/chat/message/reactions/reaction_pill.dart';

class MessageBase extends ConsumerStatefulWidget {
  const MessageBase({
    super.key,
    required this.message,
    this.isSender = false,
    this.isSelected = false,
    this.isSelectionMode = false,
    this.showAvatar = false,
    this.showSenderName = false,
    this.senderUser,
    this.onTap,
    this.onLongPress,
    this.onDoubleTap,
    this.onReply,
    this.onSelectionToggle,
    this.onOpenContextMenu,
    this.getMessage,
    this.getUser,
    this.searchHighlight = '',
    this.isCurrentSearchMatch = false,
    this.onReplyTap,
    this.quoteHighlightRange,
  });

  final MessageModel message;
  final bool isSender;
  final bool isSelected;
  final bool isSelectionMode;
  final bool showAvatar;
  final bool showSenderName;
  final String searchHighlight;
  final bool isCurrentSearchMatch;
  final UserModel? senderUser;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final VoidCallback? onDoubleTap;
  final VoidCallback? onSelectionToggle;
  final void Function(Offset position, String? selectedText)? onOpenContextMenu;
  final void Function(MessageModel message, int? rangeStart, int? rangeEnd)?
  onReply;
  final void Function({
    required String chatUUID,
    required int subID,
    required int messageID,
    int? rangeStart,
    int? rangeEnd,
  })?
  onReplyTap;
  final TextRange? quoteHighlightRange;
  final MessageModel? Function(String chatUUID, int subID, int messageID)?
  getMessage;
  final UserModel? Function(String uuid)? getUser;

  @override
  ConsumerState<MessageBase> createState() => _MessageBaseState();
}

class _MessageBaseState extends ConsumerState<MessageBase> {
  String? _selectedText;
  Offset _lastTapPosition = Offset.zero;

  MessageModel get message => widget.message;
  bool get isSender => widget.isSender;
  bool get isSelected => widget.isSelected;
  bool get isSelectionMode => widget.isSelectionMode;
  bool get showAvatar => widget.showAvatar;
  bool get showSenderName => widget.showSenderName;
  UserModel? get senderUser => widget.senderUser;
  String get searchHighlight => widget.searchHighlight;
  bool get isCurrentSearchMatch => widget.isCurrentSearchMatch;
  MessageModel? Function(String chatUUID, int subID, int messageID)?
  get getMessage => widget.getMessage;
  UserModel? Function(String uuid)? get getUser => widget.getUser;

  Widget _buildSenderAvatar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8, bottom: 2),
      child: Avatar(
        uuid: senderUser?.profilePictureUUID,
        name: senderUser?.name ?? '',
        seedKey: senderUser?.uuid ?? message.userUUID,
        size: 32,
      ),
    );
  }

  Widget _buildReactionsRow(
    BuildContext context, {
    WrapAlignment alignment = WrapAlignment.start,
  }) {
    if (message.reactions.isEmpty) return const SizedBox.shrink();

    final methods = MessageActionMethods(
      ref: ref,
      context: context,
      chatUUID: message.chatUUID,
      subID: message.subID,
    );

    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Wrap(
        alignment: alignment,
        spacing: 4,
        runSpacing: 4,
        children: message.reactions
            .whereType<Map>()
            .map((r) {
              final emoji = (r['emoji'] as String?) ?? '';
              final userUUIDs = ((r['userUUIDs'] as List?) ?? [])
                  .map((u) => u.toString())
                  .toList();

              return ReactionPill(
                emoji: emoji,
                userUUIDs: userUUIDs,
                getUser: getUser,
                onTap: () {
                  methods.toggleReaction(message, emoji);
                },
              );
            })
            .toList(),
      ),
    );
  }

  /// Parses message files into MessageFile objects.
  List<MessageFile> _parseFiles() {
    if (message.files.isEmpty) return [];
    return message.files
        .whereType<Map>()
        .map((f) => MessageFile.fromMap(Map<String, dynamic>.from(f)))
        .toList();
  }

  /// Extracts GIF URLs from message content.
  List<String> _extractGifs() {
    return extractGifUrls(message.content);
  }

  /// Builds reply previews for the message.
  List<Widget> _buildReplyPreviews(BuildContext context) {
    if (message.replyTos.isEmpty || getMessage == null) return [];

    final widgets = <Widget>[];
    for (final replyTo in message.replyTos) {
      if (replyTo is! Map) continue;
      final chatUUID = (replyTo['chatUUID'] ?? '').toString();
      final subID =
          (replyTo['subID'] is num
              ? (replyTo['subID'] as num).toInt()
              : int.tryParse(replyTo['subID']?.toString() ?? '0')) ??
          0;
      final messageID =
          (replyTo['messageID'] is num
              ? (replyTo['messageID'] as num).toInt()
              : int.tryParse(replyTo['messageID']?.toString() ?? '0')) ??
          0;
      final rangeStart = replyTo['rangeStart'] is num
          ? (replyTo['rangeStart'] as num).toInt()
          : null;
      final rangeEnd = replyTo['rangeEnd'] is num
          ? (replyTo['rangeEnd'] as num).toInt()
          : null;

      final replyMessage = getMessage!(chatUUID, subID, messageID);
      if (replyMessage == null) continue;

      final replySender = getUser?.call(replyMessage.userUUID);
      final senderName = replySender?.name ?? 'Unknown User';

      widgets.add(
        MessageReply(
          senderName: senderName,
          message: replyMessage,
          chatUUID: chatUUID,
          messageID: messageID,
          rangeStart: rangeStart,
          rangeEnd: rangeEnd,
          onTap: () {
            widget.onReplyTap?.call(
              chatUUID: chatUUID,
              subID: subID,
              messageID: messageID,
              rangeStart: rangeStart,
              rangeEnd: rangeEnd,
            );
          },
        ),
      );
    }
    return widgets;
  }

  /// Builds file attachments based on their type.
  List<Widget> _buildFileAttachments(
    BuildContext context,
    List<MessageFile> files,
  ) {
    if (files.isEmpty) return [];

    final widgets = <Widget>[];

    // Group files by type for rendering (mirrors React Native groupBy pattern)
    final images = files
        .where((f) => f.isImage && !f.mimeType.contains('gif'))
        .toList();
    final videos = files.where((f) => f.isVideo).toList();
    final audios = files.where((f) => f.isAudio).toList();
    final voices = files.where((f) => f.isVoice).toList();
    final others = files
        .where((f) => f.isOther || f.isDocument || f.isCode || f.isArchive)
        .toList();

    // Render images (single or grid)
    if (images.isNotEmpty) {
      if (images.length == 1 && videos.isEmpty) {
        // Single image only - full bubble width
        final img = images.first;
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: MessageImage(
              fileRef: img.playableUri ?? img.ref,
              uuid: img.uuid,
              size: img.size,
              width: img.width,
              height: img.height,
              isSingle: true,
              isPending: message.isPending,
              chatUUID: message.chatUUID,
            ),
          ),
        );
      } else {
        widgets.add(_buildMediaGrid(images, videos));
      }
    }

    // Render standalone videos (when not part of multi-media grid)
    if (videos.isNotEmpty && (images.isEmpty || (images.length > 1))) {
      for (final video in videos) {
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: MessageVideo(
              fileRef: video.playableUri ?? video.ref,
              uuid: video.uuid,
              size: video.size,
              width: video.width,
              height: video.height,
              duration: video.duration,
              isSingle: true,
              isPending: message.isPending,
              chatUUID: message.chatUUID,
            ),
          ),
        );
      }
    } else if (videos.length == 1 && images.isEmpty) {
      final video = videos.first;
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: MessageVideo(
            fileRef: video.playableUri ?? video.ref,
            uuid: video.uuid,
            size: video.size,
            width: video.width,
            height: video.height,
            duration: video.duration,
            isSingle: true,
            isPending: message.isPending,
            chatUUID: message.chatUUID,
          ),
        ),
      );
    }

    // Render audio files (no extra padding - audio component handles its own)
    for (final audio in audios) {
      widgets.add(
        MessageAudio(
          fileRef: audio.playableUri ?? audio.ref,
          uuid: audio.uuid,
          name: audio.name,
          size: audio.size,
          duration: audio.duration,
          isPending: message.isPending,
        ),
      );
    }

    // Render voice messages (no extra padding - voice component handles its own)
    for (final voice in voices) {
      widgets.add(
        MessageVoice(
          fileRef: voice.playableUri ?? voice.ref,
          uuid: voice.uuid,
          size: voice.size,
          duration: voice.duration,
          isPending: message.isPending,
          waveform: voice.waveform,
        ),
      );
    }

    // Render other files
    for (final file in others) {
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: MessageFileAttachment(
            fileRef: file.playableUri ?? file.ref,
            uuid: file.uuid,
            mimeType: file.mimeType,
            name: file.name,
            size: file.size,
            isPending: message.isPending,
          ),
        ),
      );
    }

    return widgets;
  }

  /// Builds a grid layout for multiple media files.
  Widget _buildMediaGrid(List<MessageFile> images, List<MessageFile> videos) {
    final allMedia = [...images, ...videos];
    if (allMedia.isEmpty) return const SizedBox.shrink();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // First row: up to 2 items
        Row(
          children: allMedia.take(2).map((media) {
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.all(1),
                child: media.isImage
                    ? MessageImage(
                        fileRef: media.playableUri ?? media.ref,
                        uuid: media.uuid,
                        size: media.size,
                        width: media.width,
                        height: media.height,
                        isSingle: false,
                        isPending: message.isPending,
                        chatUUID: message.chatUUID,
                      )
                    : MessageVideo(
                        fileRef: media.playableUri ?? media.ref,
                        uuid: media.uuid,
                        size: media.size,
                        width: media.width,
                        height: media.height,
                        duration: media.duration,
                        isSingle: false,
                        isPending: message.isPending,
                        chatUUID: message.chatUUID,
                      ),
              ),
            );
          }).toList(),
        ),
        // Second row: remaining items (up to 2 more)
        if (allMedia.length > 2)
          Row(
            children: allMedia.skip(2).take(2).map((media) {
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(1),
                  child: media.isImage
                      ? MessageImage(
                          fileRef: media.playableUri ?? media.ref,
                          uuid: media.uuid,
                          size: media.size,
                          width: media.width,
                          height: media.height,
                          isSingle: false,
                          isPending: message.isPending,
                          chatUUID: message.chatUUID,
                        )
                      : MessageVideo(
                          fileRef: media.playableUri ?? media.ref,
                          uuid: media.uuid,
                          size: media.size,
                          width: media.width,
                          height: media.height,
                          duration: media.duration,
                          isSingle: false,
                          isPending: message.isPending,
                          chatUUID: message.chatUUID,
                        ),
                ),
              );
            }).toList(),
          ),
      ],
    );
  }

  /// Builds GIF attachments from content URLs.
  List<Widget> _buildGifAttachments(List<String> gifUrls) {
    if (gifUrls.isEmpty) return [];
    return gifUrls.map((url) => MessageGif(url: url)).toList();
  }

  @override
  Widget build(BuildContext context) {
    // System messages (e.g. CHAT_CREATED, USER_JOINED, USER_LEFT) render as
    // centered pills, not chat bubbles.
    if (message.isSystem) {
      final localUserUUID = ref.watch(
        userStoreProvider.select((s) => s.localUserUUID),
      );
      final text = getSystemMessageText(
        {
          'system_action': message.systemAction,
          'content': message.content ?? '',
        },
        localUserUUID: localUserUUID,
        getUser: (uuid) {
          final user = getUser?.call(uuid);
          if (user == null) return null;
          return {'name': user.name};
        },
      );
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            MessageSystem(
              type: 'system',
              data: text,
              onOpenContextMenu: (pos) {
                widget.onOpenContextMenu?.call(pos, null);
              },
            ),
            if (message.reactions.isNotEmpty)
              _buildReactionsRow(context, alignment: WrapAlignment.center),
          ],
        ),
      );
    }

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final screenWidth = MediaQuery.sizeOf(context).width;
    final maxBubbleWidth = (screenWidth - 64).clamp(120.0, screenWidth * 0.6);

    final senderName = senderUser?.displayName.isNotEmpty == true
        ? senderUser!.displayName
        : (senderUser?.handle?.isNotEmpty == true
              ? '@${senderUser!.handle}'
              : (senderUser?.name ?? ''));

    final hasBeenRead = isSender && (message.reads.isNotEmpty);

    // Parse files and GIFs
    final files = _parseFiles();
    final gifUrls = _extractGifs();
    final textWithoutGifs = stripGifUrls(message.content ?? '').trim();

    // Determine if we have media-only content (no text, only files/gifs)
    final hasText = textWithoutGifs.isNotEmpty;
    final hasOnlyMedia = !hasText && files.isNotEmpty;
    final hasReactions = message.reactions.isNotEmpty;
    final hasReply = message.replyTos.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Align(
        alignment: isSender ? Alignment.centerRight : Alignment.centerLeft,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (!isSender && showAvatar) _buildSenderAvatar(context),
            Flexible(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxBubbleWidth),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTapDown: (details) =>
                        _lastTapPosition = details.globalPosition,
                    onSecondaryTapDown: (details) =>
                        _lastTapPosition = details.globalPosition,
                    onSecondaryTap: () {
                      widget.onOpenContextMenu?.call(
                        _lastTapPosition,
                        _selectedText,
                      );
                    },
                    onTap: () {
                      if (isSelectionMode) {
                        widget.onSelectionToggle?.call();
                      } else if (currentPlatform == AppPlatform.mobile) {
                        widget.onOpenContextMenu?.call(
                          _lastTapPosition,
                          _selectedText,
                        );
                      } else {
                        widget.onTap?.call();
                      }
                    },
                    onLongPress: () {
                      if (widget.onSelectionToggle != null) {
                        widget.onSelectionToggle!();
                      } else {
                        widget.onLongPress?.call();
                      }
                    },
                    onDoubleTap: widget.onDoubleTap,
                    borderRadius: BorderRadius.circular(18),
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSender
                            ? colorScheme.primary
                            : colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(18),
                          topRight: const Radius.circular(18),
                          bottomLeft: Radius.circular(isSender ? 18 : 4),
                          bottomRight: Radius.circular(isSender ? 4 : 18),
                        ),
                        border: isSelected
                            ? Border.all(
                                color: isSender
                                    ? colorScheme.onPrimary
                                    : colorScheme.primary,
                                width: 2,
                              )
                            : null,
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: colorScheme.primary.withValues(
                                    alpha: 0.35,
                                  ),
                                  blurRadius: 6,
                                  spreadRadius: 1,
                                ),
                              ]
                            : null,
                      ),
                      // No uniform padding - each section handles its own spacing
                      padding: hasOnlyMedia || hasReply
                          ? const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 12,
                            )
                          : const EdgeInsets.symmetric(
                              horizontal: 13,
                              vertical: 8,
                            ),
                      child: Column(
                        crossAxisAlignment: isSender
                            ? CrossAxisAlignment.end
                            : CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Group Sender Name
                          if (!isSender &&
                              showSenderName &&
                              senderName.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 3),
                              child: Text(
                                senderName,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: colorScheme.primary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),

                          // Reply previews
                          ..._buildReplyPreviews(context),

                          // File attachments (images, videos, audio, voice, files)
                          ..._buildFileAttachments(context, files),

                          // GIF attachments
                          ..._buildGifAttachments(gifUrls),

                          // Message Text (only if there's actual text content)
                          if (hasText)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2),
                              child: MessageText(
                                content: textWithoutGifs,
                                isSender: isSender,
                                isSelected: isSelected,
                                highlightQuery: searchHighlight,
                                isCurrentMatch: isCurrentSearchMatch,
                                quoteHighlightRange: widget.quoteHighlightRange,
                                onSelectionChanged: (text) {
                                  _selectedText =
                                      (text != null && text.trim().isNotEmpty)
                                      ? text
                                      : null;
                                },
                                onOpenContextMenu: isSelectionMode
                                    ? null
                                    : (pos) {
                                        widget.onOpenContextMenu?.call(
                                          pos,
                                          _selectedText,
                                        );
                                      },
                              ),
                            ),

                          // Timestamp & Status info (always shown, even with media)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: MessageTimestamp(
                              createdAt: message.createdAt,
                              isSender: isSender,
                              hasBeenRead: hasBeenRead,
                              isEdited: message.edited,
                              isPinned: message.pinned,
                              isPending: message.isPending,
                              replyCount: message.replyTos.length,
                              compact: true,
                            ),
                          ),

                          // Reactions below timestamp
                          if (hasReactions) _buildReactionsRow(context),
                        ],
                      ),
                    ),
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
