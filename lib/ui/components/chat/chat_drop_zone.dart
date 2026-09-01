import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:super_clipboard/super_clipboard.dart';
import 'package:super_drag_and_drop/super_drag_and_drop.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/chat/paste/chat_paste_helper.dart';
import 'package:novyse/ui/components/huge_icon.dart';

class ChatDropZone extends ConsumerStatefulWidget {
  const ChatDropZone({
    super.key,
    required this.chatUUID,
    required this.child,
  });

  final String chatUUID;
  final Widget child;

  @override
  ConsumerState<ChatDropZone> createState() => _ChatDropZoneState();
}

class _ChatDropZoneState extends ConsumerState<ChatDropZone> {
  bool _isDragging = false;

  void _onPasteEvent(ClipboardReadEvent event) async {
    final reader = await event.getClipboardReader();
    final media = await ChatPasteHelper.extractMediaFromReader(reader);
    if (media.isNotEmpty && mounted) {
      ChatPasteHelper.appendFiles(ref, widget.chatUUID, media);
    }
  }

  @override
  void initState() {
    super.initState();
    ClipboardEvents.instance?.registerPasteEventListener(_onPasteEvent);
  }

  @override
  void dispose() {
    ClipboardEvents.instance?.unregisterPasteEventListener(_onPasteEvent);
    super.dispose();
  }

  Future<void> _handleDrop(PerformDropEvent event) async {
    final results = <Map<String, dynamic>>[];
    for (final item in event.session.items) {
      final reader = item.dataReader;
      if (reader != null) {
        final media = await ChatPasteHelper.extractMediaFromDataReader(reader);
        if (media != null) {
          results.add(media);
        }
      }
    }
    if (results.isNotEmpty && mounted) {
      ChatPasteHelper.appendFiles(ref, widget.chatUUID, results);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    const dropFormats = [
      ...Formats.standardFormats,
      Formats.webUnknown,
      SimpleFileFormat(webFormats: ['web:file', 'web:entry', 'Files']),
    ];

    return DropRegion(
      formats: dropFormats,
      hitTestBehavior: HitTestBehavior.opaque,
      onDropOver: (event) {
        if (!_isDragging) {
          setState(() => _isDragging = true);
        }
        return DropOperation.copy;
      },
      onDropLeave: (_) => setState(() => _isDragging = false),
      onPerformDrop: (event) async {
        setState(() => _isDragging = false);
        await _handleDrop(event);
      },
      child: Stack(
        children: [
          widget.child,
          if (_isDragging)
            Positioned.fill(
              child: Container(
                color: colorScheme.surface.withValues(alpha: 0.85),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 32,
                      vertical: 24,
                    ),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                        color: colorScheme.primary,
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: colorScheme.primary.withValues(alpha: 0.15),
                          blurRadius: 16,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AppHugeIcon(
                          icon: HugeIcons.strokeRoundedFileAttachment,
                          size: 40,
                          color: colorScheme.primary,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          l10n.dropFilesHint,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: colorScheme.onSurface,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
