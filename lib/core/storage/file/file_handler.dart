import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show debugPrint;

class PickedFileAsset {
  final String name;
  final String? path;
  final int size;
  final List<int>? bytes;
  final String? extension;

  PickedFileAsset({
    required this.name,
    this.path,
    required this.size,
    this.bytes,
    this.extension,
  });

  static Future<PickedFileAsset> fromPlatformFile(PlatformFile file) async {
    List<int>? bytes;
    try {
      bytes = await file.readAsBytes();
    } catch (_) {}

    var size = 0;
    try {
      size = await file.length();
    } catch (_) {
      size = bytes?.length ?? 0;
    }

    return PickedFileAsset(
      name: file.name,
      path: file.path,
      size: size,
      bytes: bytes,
      extension: file.extension,
    );
  }

  Map<String, dynamic> toMap() => {
    'name': name,
    'path': path,
    'size': size,
    'extension': extension,
  };
}

/// Service for picking files and media from device storage across platforms.
class FileHandler {
  /// Opens the native file menu based on requested file category.
  /// [type] can be `'Image'`, `'Media'`, `'Video'`, `'Audio'`, or `'File'`.
  static Future<List<PickedFileAsset>> openNativeFileMenu(String type) async {
    switch (type.toLowerCase()) {
      case 'image':
        return pickImage();
      case 'video':
        return pickVideo();
      case 'audio':
        return pickAudio();
      case 'media':
        return pickMedia();
      case 'file':
      default:
        return pickFile();
    }
  }

  /// Picks generic files.
  static Future<List<PickedFileAsset>> pickFile({
    List<String>? allowedExtensions,
  }) async {
    try {
      final result = await FilePicker.pickFiles(
        type: allowedExtensions != null && allowedExtensions.isNotEmpty
            ? FileType.custom
            : FileType.any,
        allowedExtensions: allowedExtensions,
      );

      if (result.isNotEmpty) {
        final assets = await Future.wait(
          result.map(PickedFileAsset.fromPlatformFile),
        );
        return assets;
      }
    } catch (e) {
      debugPrint('FileHandler pickFile error: $e');
    }
    return [];
  }

  /// Picks media (Images and Videos).
  static Future<List<PickedFileAsset>> pickMedia() async {
    try {
      final result = await FilePicker.pickFiles(type: FileType.media);

      if (result.isNotEmpty) {
        final assets = await Future.wait(
          result.map(PickedFileAsset.fromPlatformFile),
        );
        return assets;
      }
    } catch (e) {
      debugPrint('FileHandler pickMedia error: $e');
    }
    return [];
  }

  /// Picks images only.
  static Future<List<PickedFileAsset>> pickImage() async {
    try {
      final result = await FilePicker.pickFiles(type: FileType.image);

      if (result.isNotEmpty) {
        final assets = await Future.wait(
          result.map(PickedFileAsset.fromPlatformFile),
        );
        return assets;
      }
    } catch (e) {
      debugPrint('FileHandler pickImage error: $e');
    }
    return [];
  }

  /// Picks videos only.
  static Future<List<PickedFileAsset>> pickVideo() async {
    try {
      final result = await FilePicker.pickFiles(type: FileType.video);

      if (result.isNotEmpty) {
        final assets = await Future.wait(
          result.map(PickedFileAsset.fromPlatformFile),
        );
        return assets;
      }
    } catch (e) {
      debugPrint('FileHandler pickVideo error: $e');
    }
    return [];
  }

  /// Picks audio files only.
  static Future<List<PickedFileAsset>> pickAudio() async {
    try {
      final result = await FilePicker.pickFiles(type: FileType.audio);

      if (result.isNotEmpty) {
        final assets = await Future.wait(
          result.map(PickedFileAsset.fromPlatformFile),
        );
        return assets;
      }
    } catch (e) {
      debugPrint('FileHandler pickAudio error: $e');
    }
    return [];
  }
}
