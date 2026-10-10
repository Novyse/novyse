import 'package:novyse/core/chat/message_format.dart';
import 'package:novyse/core/storage/file/file_type.dart';
import 'package:novyse/core/stores/message_store.dart';

class FileEntry {
  final Map<String, dynamic> file;
  final DateTime createdAt;

  const FileEntry({required this.file, required this.createdAt});
}

List<FileEntry> collectOverviewFiles(List<MessageModel> messages) {
  final out = <FileEntry>[];
  for (final m in messages) {
    for (final f in m.files) {
      out.add(FileEntry(file: f, createdAt: m.createdAt));
    }
  }
  out.sort((a, b) => b.createdAt.compareTo(a.createdAt));
  return out;
}

FileTypeCategory categoryOfFile(Map<String, dynamic> file) {
  final mime = getMimeType(file);
  final name = (file['name'] ?? file['fileName'] ?? '').toString();
  return getFileType(mime, name);
}

bool isGifFile(Map<String, dynamic> file) {
  final name = (file['name'] ?? file['fileName'] ?? '')
      .toString()
      .toLowerCase();
  if (name.endsWith('.gif')) return true;
  final mime = getMimeType(file).toLowerCase();
  return mime == 'image/gif';
}

final urlRegex = RegExp(r'https?://[^\s<>"`]+');

List<({String url, MessageModel message})> collectOverviewLinks(
  List<MessageModel> messages,
) {
  final out = <({String url, MessageModel message})>[];
  final seen = <String>{};
  for (final m in messages) {
    final content = m.content;
    if (content == null || content.isEmpty) continue;
    for (final match in urlRegex.allMatches(content)) {
      var url = match.group(0) ?? '';
      url = url.replaceAll(RegExp(r'[),.;!?]+$'), '');
      if (url.isEmpty || !seen.add(url)) continue;
      out.add((url: url, message: m));
    }
  }
  return out;
}

List<({String url, MessageModel message})> collectOverviewGifLinks(
  List<MessageModel> messages,
) {
  final out = <({String url, MessageModel message})>[];
  final seen = <String>{};
  for (final m in messages) {
    for (final url in extractGifUrls(m.content)) {
      if (!seen.add(url)) continue;
      out.add((url: url, message: m));
    }
  }
  return out;
}

String formatBytesLabel(dynamic size) {
  final bytes = size is num ? size.toDouble() : double.tryParse('$size') ?? 0;
  if (bytes <= 0) return '';
  if (bytes < 1024) return '${bytes.toStringAsFixed(0)} B';
  if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
  if (bytes < 1024 * 1024 * 1024) {
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
  return '${(bytes / (1024 * 1024 * 1024)).toStringAsFixed(1)} GB';
}
