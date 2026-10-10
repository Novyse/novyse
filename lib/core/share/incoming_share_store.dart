import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A file received from another app via the OS share sheet,
/// normalized to the draft-bar format.
@immutable
class IncomingShareFile {
  const IncomingShareFile({
    required this.name,
    required this.path,
    required this.size,
    required this.mimeType,
  });

  final String name;
  final String path;
  final int size;
  final String mimeType;

  Map<String, dynamic> toDraftMap() => <String, dynamic>{
    'name': name,
    'path': path,
    'uri': path,
    'size': size,
    'mimeType': mimeType,
  };
}

/// Pending share received from another app, waiting for the user
/// to pick a chat. Consumed once: the first opened chat absorbs it.
@immutable
class IncomingShareState {
  const IncomingShareState({this.text = '', this.files = const []});

  final String text;
  final List<IncomingShareFile> files;

  bool get isEmpty => text.trim().isEmpty && files.isEmpty;
  bool get isNotEmpty => !isEmpty;
}

/// Global holder for a pending incoming share.
class IncomingShareNotifier extends Notifier<IncomingShareState> {
  @override
  IncomingShareState build() => const IncomingShareState();

  void setPending({String text = '', List<IncomingShareFile> files = const []}) {
    state = IncomingShareState(text: text, files: files);
  }

  void clear() {
    state = const IncomingShareState();
  }
}

final incomingShareProvider =
    NotifierProvider<IncomingShareNotifier, IncomingShareState>(
      IncomingShareNotifier.new,
    );
