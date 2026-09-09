import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/storage/file/file_handler.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/ui/components/chat/paste/chat_paste_helper.dart';

/// Handles the enabled entries of the attach menu.
class AttachMenuHandler {
  AttachMenuHandler._();

  /// Picks media (images and videos) and appends them to the chat draft.
  static Future<void> pickMedia(WidgetRef ref, String chatUUID) async {
    try {
      final assets = await FileHandler.pickMedia();
      if (assets.isEmpty) return;
      ChatPasteHelper.appendFiles(
        ref,
        chatUUID,
        assets.map(_assetToDraftFile).toList(),
      );
    } catch (e) {
      debugPrint('AttachMenuHandler pickMedia error: $e');
    }
  }

  /// Picks generic files (no type filter) and appends them to the chat draft.
  static Future<void> pickFile(WidgetRef ref, String chatUUID) async {
    try {
      final assets = await FileHandler.pickFile();
      if (assets.isEmpty) return;
      ChatPasteHelper.appendFiles(
        ref,
        chatUUID,
        assets.map(_assetToDraftFile).toList(),
      );
    } catch (e) {
      debugPrint('AttachMenuHandler pickFile error: $e');
    }
  }

  /// Converts a picked asset to the draft file map shape used by
  static Map<String, dynamic> _assetToDraftFile(PickedFileAsset asset) {
    final mimeType = getMimeTypeByName(asset.name);
    return {
      'name': asset.name,
      'path': asset.path,
      'uri': asset.path,
      'bytes': asset.bytes,
      'size': asset.size,
      'mimeType': mimeType,
    };
  }
}
