import 'package:novyse/core/storage/file/file_type.dart';

/// Represents a file attachment in a message.
class MessageFile {
  final String uuid;
  final String name;
  final String mimeType;
  final int size;
  final String? ref; // Storage reference key (used after download/save)
  final String? uri; // Direct URI/path (from local recording, web blob, etc.)
  final int? width;
  final int? height;
  final int? duration;
  final List<double>? waveform;
  final bool isExplicitVoice; // Set when type='VOICE' is explicitly provided

  const MessageFile({
    required this.uuid,
    required this.name,
    required this.mimeType,
    required this.size,
    this.ref,
    this.uri,
    this.width,
    this.height,
    this.duration,
    this.waveform,
    this.isExplicitVoice = false,
  });

  factory MessageFile.fromMap(Map<String, dynamic> map) {
    // Preserve the explicit type field if set (e.g., from voice recorder)
    final explicitType = map['type'] as String?;
    final isExplicitVoice = explicitType?.toUpperCase() == 'VOICE';
    final name = (map['name'] ?? '').toString();
    var mime = (map['mimeType'] ?? map['type'] ?? '').toString();

    // If mimeType is empty or generic octet-stream, infer from filename
    if (mime.isEmpty || mime == 'application/octet-stream') {
      final inferred = getMimeTypeByName(name);
      if (inferred != 'application/octet-stream') {
        mime = inferred;
      } else if (mime.isEmpty) {
        mime = defaultMimeType;
      }
    }

    return MessageFile(
      uuid: (map['uuid'] ?? '').toString(),
      name: name,
      mimeType: mime,
      size: map['size'] is num ? (map['size'] as num).toInt() : 0,
      ref: map['ref']?.toString(),
      uri: map['uri']?.toString() ?? map['path']?.toString(),
      width: map['width'] is num ? (map['width'] as num).toInt() : null,
      height: map['height'] is num ? (map['height'] as num).toInt() : null,
      duration: map['duration'] is num
          ? (map['duration'] as num).toInt()
          : null,
      waveform: map['waveform'] is List
          ? (map['waveform'] as List).map((e) => (e as num).toDouble()).toList()
          : null,
      isExplicitVoice: isExplicitVoice,
    );
  }

  Map<String, dynamic> toMap() {
    final map = <String, dynamic>{
      'uuid': uuid,
      'name': name,
      'mimeType': mimeType,
      'size': size,
    };
    if (ref != null) map['ref'] = ref;
    if (uri != null) map['uri'] = uri;
    if (width != null) map['width'] = width;
    if (height != null) map['height'] = height;
    if (duration != null) map['duration'] = duration;
    if (waveform != null) map['waveform'] = waveform;
    return map;
  }

  /// Returns the best available URI for playback.
  /// Priority: uri > ref
  String? get playableUri => uri ?? ref;

  FileTypeCategory get category => getFileType(mimeType, name);

  /// Voice detection logic:
  /// 1. Explicit type='VOICE' from recorder
  /// 2. Waveform data present
  /// 3. Category is voice
  /// 4. Filename starts with 'novyse_vocal_'
  bool get isVoice {
    if (isExplicitVoice) return true;
    if (waveform != null && waveform!.isNotEmpty) return true;
    if (category == FileTypeCategory.voice) return true;
    if (name.toLowerCase().startsWith('novyse_vocal_')) return true;
    return false;
  }

  bool get isImage => category == FileTypeCategory.image;
  bool get isVideo => category == FileTypeCategory.video;
  bool get isAudio =>
      (category == FileTypeCategory.audio ||
          category == FileTypeCategory.voice) &&
      !isVoice;
  bool get isDocument => category == FileTypeCategory.document;
  bool get isCode => category == FileTypeCategory.code;
  bool get isArchive => category == FileTypeCategory.archive;
  bool get isOther =>
      category == FileTypeCategory.other &&
      !isVoice &&
      !isAudio &&
      !isImage &&
      !isVideo;
}
