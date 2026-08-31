import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'chat_catalog.dart';
import 'chat_routes.dart';

class ChatDetailPage extends StatelessWidget {
  const ChatDetailPage({super.key, required this.chatId});

  final String chatId;

  @override
  Widget build(BuildContext context) {
    final chat = ChatCatalog.byId(chatId);

    if (chat == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Chat non trovata'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => popOrChats(context),
          ),
        ),
        body: Center(child: Text('Nessuna chat con id "$chatId"')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(chat.name),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => popOrChats(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
        children: [
          Text(
            chat.message,
            style: Theme.of(context).textTheme.headlineSmall
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
            ),
            child: Text(
              chat.details,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
          const SizedBox(height: 24),
          const Divider(),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.info_outline),
            title: const Text('Info chat'),
            subtitle: const Text('Sottopagina nel detail (router)'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/chats/$chatId/info'),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.photo_outlined),
            title: const Text('Media'),
            subtitle: const Text('Altra sottopagina nel detail'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/chats/$chatId/media'),
          ),
        ],
      ),
    );
  }
}
