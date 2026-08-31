import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'chat_catalog.dart';
import 'chat_routes.dart';

class ChatInfoPage extends StatelessWidget {
  const ChatInfoPage({super.key, required this.chatId});

  final String chatId;

  @override
  Widget build(BuildContext context) {
    final chat = ChatCatalog.byId(chatId);

    return Scaffold(
      appBar: AppBar(
        title: Text(chat == null ? 'Info chat' : 'Info · ${chat.name}'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => popOrChats(context),
        ),
      ),
      body: chat == null
          ? const Center(child: Text('Chat non trovata'))
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              children: [
                ListTile(
                  leading: CircleAvatar(child: Text(chat.name.substring(0, 1))),
                  title: Text(chat.name),
                  subtitle: Text('id: ${chat.id}'),
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.photo_outlined),
                  title: const Text('Media'),
                  subtitle: const Text('Apri la sottopagina media'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/chats/$chatId/media'),
                ),
                const ListTile(
                  leading: Icon(Icons.notifications_outlined),
                  title: Text('Notifiche'),
                  subtitle: Text('Placeholder'),
                ),
              ],
            ),
    );
  }
}

class ChatMediaPage extends StatelessWidget {
  const ChatMediaPage({super.key, required this.chatId});

  final String chatId;

  @override
  Widget build(BuildContext context) {
    final chat = ChatCatalog.byId(chatId);

    return Scaffold(
      appBar: AppBar(
        title: Text(chat == null ? 'Media' : 'Media · ${chat.name}'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => popOrChats(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        children: [
          for (var i = 1; i <= 4; i++)
            ListTile(
              leading: const Icon(Icons.image_outlined),
              title: Text('Media $i'),
              subtitle: Text('Allegato di ${chat?.name ?? chatId}'),
            ),
        ],
      ),
    );
  }
}
