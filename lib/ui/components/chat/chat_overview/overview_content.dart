import 'package:flutter/material.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/stores/message_store.dart';

import 'overview_collectors.dart';
import 'overview_rows.dart';
import 'overview_tab.dart';

class OverviewTabContent extends StatelessWidget {
  const OverviewTabContent({
    super.key,
    required this.tab,
    required this.messages,
    required this.chatUUID,
  });

  final OverviewTab tab;
  final List<MessageModel> messages;
  final String chatUUID;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    if (tab == OverviewTab.links) {
      final links = collectOverviewLinks(messages);
      if (links.isEmpty) {
        return OverviewEmptyState(icon: Icons.link, text: l10n.overviewNoLinks);
      }
      return Column(
        children: [
          for (final item in links)
            OverviewLinkRow(url: item.url, message: item.message),
        ],
      );
    }

    if (tab == OverviewTab.gifs) {
      final gifLinks = collectOverviewGifLinks(messages);
      final gifFiles = collectOverviewFiles(messages)
          .where((e) => isGifFile(e.file))
          .toList();
      if (gifLinks.isEmpty && gifFiles.isEmpty) {
        return OverviewEmptyState(
          icon: Icons.gif_box_outlined,
          text: l10n.overviewNoGifs,
        );
      }
      return Column(
        children: [
          for (final item in gifLinks)
            OverviewLinkRow(url: item.url, message: item.message),
          for (final entry in gifFiles)
            OverviewFileRow(entry: entry, chatUUID: chatUUID),
        ],
      );
    }

    final files = collectOverviewFiles(messages);
    final filtered = files.where((e) {
      final category = categoryOfFile(e.file);
      return switch (tab) {
        OverviewTab.media =>
          (category == FileTypeCategory.image ||
                  category == FileTypeCategory.video) &&
              !isGifFile(e.file),
        OverviewTab.files => true,
        OverviewTab.music => category == FileTypeCategory.audio,
        OverviewTab.voice => category == FileTypeCategory.voice,
        _ => true,
      };
    }).toList();

    if (filtered.isEmpty) {
      return OverviewEmptyState(
        icon: switch (tab) {
          OverviewTab.media => Icons.image_outlined,
          OverviewTab.music => Icons.music_note_outlined,
          OverviewTab.voice => Icons.mic_outlined,
          _ => Icons.folder_outlined,
        },
        text: switch (tab) {
          OverviewTab.media => l10n.overviewNoMedia,
          OverviewTab.music => l10n.overviewNoMusic,
          OverviewTab.voice => l10n.overviewNoVoice,
          _ => l10n.overviewNoFiles,
        },
      );
    }

    return Column(
      children: [
        for (final entry in filtered)
          OverviewFileRow(entry: entry, chatUUID: chatUUID),
      ],
    );
  }
}
