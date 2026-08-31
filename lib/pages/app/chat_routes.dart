import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

String? chatUUIDFromPath(String path) {
  final segments = Uri.parse(path).pathSegments;
  if (segments.length >= 2 && segments.first == 'chats') {
    return segments[1];
  }
  return null;
}

String pathForTab(int index) {
  switch (index) {
    case 1:
      return '/settings';
    case 2:
      return '/profile';
    default:
      return '/chats';
  }
}

int? tabIndexFromPath(String path) {
  if (chatUUIDFromPath(path) != null) return null;
  if (path.startsWith('/settings')) return 1;
  if (path.startsWith('/profile')) return 2;
  if (path.startsWith('/chats')) return 0;
  return null;
}

void popOrChats(BuildContext context) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go('/chats');
  }
}
