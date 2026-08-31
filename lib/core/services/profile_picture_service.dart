import 'dart:typed_data';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/storage/file/file_storage.dart';
import 'package:novyse/core/storage/file/s3_adapter.dart';

/// Singleton service responsible for managing, downloading, and resolving profile pictures.
class ProfilePictureService {
  ProfilePictureService._();

  static final ProfilePictureService instance = ProfilePictureService._();

  AppDatabase get _database => AppDatabase.instance;
  FileStorage get _storage => FileStorage.instance;
  Gateway get _gateway => apiGateway;
  S3Adapter get _s3Adapter => S3Adapter.instance;

  /// In-flight downloads map to avoid concurrent duplicate requests.
  final Map<String, Future<String?>> _inFlightDownloads = {};

  /// Downloads profile picture metadata from the server, fetches file bytes from S3,
  /// saves to local storage, and updates SQLite database ref.
  Future<String?> downloadProfilePicture(String fileUUID) async {
    if (fileUUID.isEmpty) {
      return null;
    }

    try {
      // 1. Download file metadata from server via API Gateway
      final meta = await _gateway.file.retrieve(fileUUID);
      if (!meta.success ||
          meta.downloadURL == null ||
          meta.downloadURL!.isEmpty) {
        debugPrint(
          'ProfilePictureService: Gateway retrieve failed for $fileUUID',
        );
        return null;
      }

      if (meta.mimeType == null || meta.size == null) {
        debugPrint('ProfilePictureService: Meta data is missing for $fileUUID');
        return null;
      }

      final downloadURL = meta.downloadURL!;
      final name = meta.name ?? fileUUID;
      final mimeType = meta.mimeType!;
      final size = meta.size!;

      // 2. Insert file info into SQLite database
      await _database.file.add(fileUUID, name, mimeType, size);

      // 3. Download bytes from S3 presigned URL
      final Uint8List bytes = await _s3Adapter.download(
        downloadURL: downloadURL,
        fileUUID: fileUUID,
      );

      if (bytes.isEmpty) {
        debugPrint(
          'ProfilePictureService: Downloaded empty bytes for $fileUUID',
        );
        return null;
      }

      // 4. Save bytes to local file storage
      final saveResult = await _storage.save.byBytes(bytes, fileUUID);
      if (saveResult.ref.isEmpty) {
        debugPrint(
          'ProfilePictureService: File save returned empty ref for $fileUUID',
        );
        return null;
      }

      // 5. Update file info in database
      await _database.file.update.ref(fileUUID, saveResult.ref);

      return saveResult.ref;
    } catch (e) {
      debugPrint(
        'ProfilePictureService: downloadProfilePicture error for $fileUUID: $e',
      );
      return null;
    }
  }

  /// Resolves the local or remote URI of a profile picture given its [uuid] or direct [uri].
  ///
  /// Returns `null` if no profile picture exists or if retrieval fails.
  Future<String?> getProfilePictureUri(String? uuid, {String? uri}) async {
    if (uri != null && uri.isNotEmpty) {
      return uri;
    }

    if (uuid == null || uuid.isEmpty) {
      return null;
    }

    try {
      // Check if file ref exists in database
      String? fetchedRef = await _database.file.get.ref(uuid);

      // If ref exists in DB, check if file exists on disk/storage
      if (fetchedRef != null && fetchedRef.isNotEmpty) {
        final existingUri = await _storage.read(fetchedRef);
        if (existingUri != null && existingUri.isNotEmpty) {
          return existingUri;
        }
      }

      // If missing from DB or storage, download it with deduplication
      if (_inFlightDownloads.containsKey(uuid)) {
        return await _inFlightDownloads[uuid];
      }

      final downloadFuture = _downloadAndResolveUri(uuid);
      _inFlightDownloads[uuid] = downloadFuture;

      try {
        return await downloadFuture;
      } finally {
        _inFlightDownloads.remove(uuid);
      }
    } catch (error) {
      debugPrint(
        'ProfilePictureService: Profile picture ref fetch/download error: $error',
      );
      return null;
    }
  }

  Future<String?> _downloadAndResolveUri(String uuid) async {
    final downloadedRef = await downloadProfilePicture(uuid);
    if (downloadedRef != null && downloadedRef.isNotEmpty) {
      return await _storage.read(downloadedRef);
    }
    return null;
  }
}

/// Riverpod provider for [ProfilePictureService].
final profilePictureServiceProvider = Provider<ProfilePictureService>((ref) {
  return ProfilePictureService.instance;
});

/// Riverpod FutureProvider family for resolving a profile picture URI by UUID.
final profilePictureUriProvider = FutureProvider.family<String?, String?>((
  ref,
  uuid,
) async {
  if (uuid == null || uuid.isEmpty) return null;
  final service = ref.watch(profilePictureServiceProvider);
  return service.getProfilePictureUri(uuid);
});
