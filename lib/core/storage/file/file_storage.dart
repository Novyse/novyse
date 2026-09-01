import 'dart:io' as io;
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

class FileSaveResult {
  final String ref;
  final int size;

  FileSaveResult({required this.ref, required this.size});

  Map<String, dynamic> toMap() => {'ref': ref, 'size': size};
}

/// Cross-platform local file storage manager.
class FileStorage {
  FileStorage._();
  static final FileStorage instance = FileStorage._();

  // In-memory fallback for web or testing
  final Map<String, Uint8List> _webMemoryStore = {};
  String? _customStoragePath;

  void setCustomStoragePath(String? path) {
    _customStoragePath = path;
  }

  late final FileSaveService save = FileSaveService(this);

  Future<String> _getStorageDirectoryPath() async {
    if (_customStoragePath != null && _customStoragePath!.isNotEmpty) {
      final customDir = io.Directory(_customStoragePath!);
      if (!await customDir.exists()) {
        await customDir.create(recursive: true);
      }
      return customDir.path;
    }

    if (kIsWeb) return '';
    try {
      final dir = await getApplicationDocumentsDirectory();
      final storageDir = io.Directory(p.join(dir.path, 'novyse_files'));
      if (!await storageDir.exists()) {
        await storageDir.create(recursive: true);
      }
      return storageDir.path;
    } catch (_) {
      try {
        final temp = await getTemporaryDirectory();
        return temp.path;
      } catch (_) {
        // Fallback for tests or environments without platform channels
        final sysTemp = io.Directory.systemTemp;
        final storageDir = io.Directory(
          p.join(sysTemp.path, 'novyse_local_files'),
        );
        if (!await storageDir.exists()) {
          await storageDir.create(recursive: true);
        }
        return storageDir.path;
      }
    }
  }

  /// Retrieves the file URI for a given reference key.
  Future<String?> read(String ref) async {
    if (ref.isEmpty) return null;
    if (kIsWeb) {
      return _webMemoryStore.containsKey(ref) ? ref : null;
    }

    // If already a full file path that exists
    if (ref.startsWith('file://') || p.isAbsolute(ref)) {
      final cleanPath = ref.replaceFirst('file://', '');
      final file = io.File(cleanPath);
      if (await file.exists()) return file.uri.toString();
    }

    final dirPath = await _getStorageDirectoryPath();
    final file = io.File(p.join(dirPath, ref));
    if (await file.exists()) {
      return file.uri.toString();
    }
    return null;
  }

  /// Synchronously gets bytes from memory store (primarily on web/in-memory).
  Uint8List? getBytesSync(String ref) {
    if (ref.isEmpty) return null;
    return _webMemoryStore[ref];
  }

  /// Reads raw bytes of a file by its URI or reference key.
  Future<Uint8List?> getBytes(String uriOrRef) async {
    if (uriOrRef.isEmpty) return null;
    if (kIsWeb) {
      if (_webMemoryStore.containsKey(uriOrRef)) {
        return _webMemoryStore[uriOrRef];
      }
      if (uriOrRef.startsWith('blob:') ||
          uriOrRef.startsWith('http://') ||
          uriOrRef.startsWith('https://') ||
          uriOrRef.startsWith('data:')) {
        try {
          final dioInstance = Dio();
          final res = await dioInstance.get<List<int>>(
            uriOrRef,
            options: Options(responseType: ResponseType.bytes),
          );
          if (res.data != null) {
            return Uint8List.fromList(res.data!);
          }
        } catch (e) {
          debugPrint('[FileStorage] Error fetching web URI bytes: $e');
        }
      }
      return null;
    }

    try {
      String path;
      if (uriOrRef.startsWith('file://')) {
        path = uriOrRef.replaceFirst('file://', '');
      } else if (p.isAbsolute(uriOrRef)) {
        path = uriOrRef;
      } else {
        final dirPath = await _getStorageDirectoryPath();
        path = p.join(dirPath, uriOrRef);
      }

      final file = io.File(path);
      if (await file.exists()) {
        return await file.readAsBytes();
      }
      return null;
    } catch (e) {
      debugPrint('FileStorage getBytes error: $e');
      return null;
    }
  }

  /// Checks if a file exists locally.
  Future<bool> exists(String ref) async {
    if (ref.isEmpty) return false;
    if (kIsWeb) {
      return _webMemoryStore.containsKey(ref);
    }
    try {
      final path = await read(ref);
      return path != null;
    } catch (_) {
      return false;
    }
  }

  /// Returns file size in bytes.
  Future<int?> getSize(String ref) async {
    if (ref.isEmpty) return null;
    if (kIsWeb) {
      return _webMemoryStore[ref]?.length;
    }
    try {
      final fileUri = await read(ref);
      if (fileUri != null) {
        final file = io.File(fileUri.replaceFirst('file://', ''));
        return await file.length();
      }
      return null;
    } catch (e) {
      debugPrint('FileStorage getSize error: $e');
      return null;
    }
  }

  /// Deletes a file by its reference key.
  Future<bool> delete(String ref) async {
    if (ref.isEmpty) return false;
    if (kIsWeb) {
      return _webMemoryStore.remove(ref) != null;
    }
    try {
      final fileUri = await read(ref);
      if (fileUri != null) {
        final file = io.File(fileUri.replaceFirst('file://', ''));
        if (await file.exists()) {
          await file.delete();
          return true;
        }
      }
      return false;
    } catch (e) {
      debugPrint('FileStorage delete error: $e');
      return false;
    }
  }

  /// Clears all files in local storage.
  Future<void> clearAll() async {
    if (kIsWeb) {
      _webMemoryStore.clear();
      return;
    }
    try {
      final dirPath = await _getStorageDirectoryPath();
      final dir = io.Directory(dirPath);
      if (await dir.exists()) {
        await dir.delete(recursive: true);
        await dir.create(recursive: true);
      }
    } catch (e) {
      debugPrint('FileStorage clearAll error: $e');
    }
  }
}

class FileSaveService {
  final FileStorage _storage;
  FileSaveService(this._storage);

  /// Saves a file by its existing URI.
  Future<FileSaveResult> byUri(String uri, [String? key]) async {
    if (uri.isEmpty) {
      throw ArgumentError('URI is required to save a file.');
    }

    final finalKey = key ?? p.basename(uri.split('?').first);

    if (kIsWeb) {
      final bytes = await _storage.getBytes(uri);
      if (bytes != null) {
        return byBytes(bytes, finalKey);
      }
      return FileSaveResult(ref: finalKey, size: 0);
    }

    try {
      final cleanSourcePath = uri.replaceFirst('file://', '');
      final sourceFile = io.File(cleanSourcePath);

      if (!await sourceFile.exists()) {
        throw io.FileSystemException('Source file does not exist: $uri');
      }

      final dirPath = await _storage._getStorageDirectoryPath();
      final destPath = p.join(dirPath, finalKey);
      final destFile = io.File(destPath);

      if (await destFile.exists()) {
        await destFile.delete();
      }

      await sourceFile.copy(destPath);
      final size = await destFile.length();

      return FileSaveResult(ref: finalKey, size: size);
    } catch (e) {
      debugPrint('FileStorage save.byUri error: $e');
      rethrow;
    }
  }

  /// Saves a file from raw bytes.
  Future<FileSaveResult> byBytes(List<int> bytes, [String? key]) async {
    if (bytes.isEmpty) {
      throw ArgumentError('Bytes are required to save a file.');
    }

    final finalKey = key ?? DateTime.now().millisecondsSinceEpoch.toString();
    final uint8Bytes = bytes is Uint8List ? bytes : Uint8List.fromList(bytes);

    if (kIsWeb) {
      _storage._webMemoryStore[finalKey] = uint8Bytes;
      return FileSaveResult(ref: finalKey, size: uint8Bytes.length);
    }

    try {
      final dirPath = await _storage._getStorageDirectoryPath();
      final destPath = p.join(dirPath, finalKey);
      final destFile = io.File(destPath);

      await destFile.writeAsBytes(uint8Bytes, flush: true);
      return FileSaveResult(ref: finalKey, size: uint8Bytes.length);
    } catch (e) {
      debugPrint('FileStorage save.byBytes error: $e');
      rethrow;
    }
  }
}

/// Riverpod provider for [FileStorage].
final fileStorageProvider = Provider<FileStorage>((ref) {
  return FileStorage.instance;
});
