import 'package:novyse/core/storage/file/file_utils.dart';

class InvalidFileData {
  final int index;
  final List<String> errors;

  InvalidFileData({required this.index, required this.errors});

  Map<String, dynamic> toMap() => {
        'index': index,
        'errors': errors,
      };
}

class FileValidationResult {
  final String? globalError;
  final List<InvalidFileData> invalidFilesData;
  final bool hasErrors;

  FileValidationResult({
    this.globalError,
    required this.invalidFilesData,
    required this.hasErrors,
  });
}

/// Validates a list of files against size and type constraints.
FileValidationResult validateFiles(
  List<dynamic> newFiles, {
  String fileType = 'All',
  int maxFiles = 10,
  int maxSingleSize = 50 * 1024 * 1024, // 50 MB
  int maxTotalSize = 100 * 1024 * 1024, // 100 MB
}) {
  String? globalError;
  final invalidFilesData = <InvalidFileData>[];

  // Check total file count
  if (newFiles.length > maxFiles) {
    globalError = 'Too many files. Maximum allowed: $maxFiles';
  }

  // Check total size
  final totalSize = calculateTotalSize(newFiles);
  if (totalSize > maxTotalSize) {
    globalError =
        'Total file size too large. Maximum allowed: ${formatFileSize(maxTotalSize)}';
  }

  // Check individual file sizes and types
  for (var i = 0; i < newFiles.length; i++) {
    final raw = newFiles[i];
    final errors = <String>[];

    var fileSize = 0;
    var fileMimeType = '';

    if (raw is Map) {
      final s = raw['size'] ?? raw['fileSize'] ?? 0;
      fileSize = s is num ? s.toInt() : 0;
      fileMimeType = (raw['mimeType'] ?? raw['type'] ?? '') as String;
    }

    if (fileSize > maxSingleSize) {
      errors.add(
        'File size exceeds maximum allowed size of ${formatFileSize(maxSingleSize)}',
      );
    }

    if (fileSize == 0) {
      errors.add('File size is 0. Please select a valid file.');
    }

    if (fileType.toLowerCase() != 'all') {
      final allowed = fileType.toLowerCase();
      if (allowed == 'image' && !fileMimeType.startsWith('image/')) {
        errors.add('File type not allowed. Allowed types: $fileType');
      } else if (allowed == 'video' && !fileMimeType.startsWith('video/')) {
        errors.add('File type not allowed. Allowed types: $fileType');
      } else if (allowed == 'audio' && !fileMimeType.startsWith('audio/')) {
        errors.add('File type not allowed. Allowed types: $fileType');
      }
    }

    if (errors.isNotEmpty) {
      invalidFilesData.add(InvalidFileData(index: i, errors: errors));
    }
  }

  if (globalError != null) {
    if (invalidFilesData.isEmpty && newFiles.isNotEmpty) {
      invalidFilesData.add(InvalidFileData(index: 0, errors: [globalError]));
    } else {
      for (final d in invalidFilesData) {
        if (!d.errors.contains(globalError)) {
          d.errors.add(globalError);
        }
      }
    }
  }

  return FileValidationResult(
    globalError: globalError,
    invalidFilesData: invalidFilesData,
    hasErrors: globalError != null || invalidFilesData.isNotEmpty,
  );
}
