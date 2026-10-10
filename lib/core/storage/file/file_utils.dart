import 'dart:math' as math;

/// Formats a time in seconds to `MM:SS` or `HH:MM:SS`.
String formatTime(num? seconds) {
  if (seconds == null || seconds <= 0) return '00:00';
  final totalSecs = seconds.toInt();
  final hours = totalSecs ~/ 3600;
  final minutes = (totalSecs % 3600) ~/ 60;
  final secs = totalSecs % 60;

  final minStr = minutes.toString().padLeft(2, '0');
  final secStr = secs.toString().padLeft(2, '0');

  if (hours > 0) {
    final hourStr = hours.toString().padLeft(2, '0');
    return '$hourStr:$minStr:$secStr';
  }
  return '$minStr:$secStr';
}

/// Formats a duration in seconds into a readable string (e.g. `1m 20s` or `45s`).
String formatDuration(num? seconds) {
  if (seconds == null || seconds <= 0) return '0s';
  final totalSecs = seconds.toInt();
  final hours = totalSecs ~/ 3600;
  final minutes = (totalSecs % 3600) ~/ 60;
  final secs = totalSecs % 60;

  final parts = <String>[];
  if (hours > 0) parts.add('${hours}h');
  if (minutes > 0) parts.add('${minutes}m');
  if (secs > 0 || parts.isEmpty) parts.add('${secs}s');

  return parts.join(' ');
}

/// Formats a file size in bytes to human-readable format (`B`, `KB`, `MB`, `GB`).
String formatFileSize(num? bytes) {
  if (bytes == null || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  final i = (math.log(bytes) / math.log(1024)).floor();
  final safeIndex = math.min(i, units.length - 1);
  final size = bytes / math.pow(1024, safeIndex);
  return '${size.toStringAsFixed(2)} ${units[safeIndex]}';
}

/// Calculates the total size in bytes of a list of files or file maps.
int calculateTotalSize(List<dynamic> files) {
  var total = 0;
  for (final file in files) {
    if (file is Map) {
      final size = file['size'] ?? file['fileSize'] ?? 0;
      if (size is num) total += size.toInt();
    } else if (file is num) {
      total += file.toInt();
    }
  }
  return total;
}
