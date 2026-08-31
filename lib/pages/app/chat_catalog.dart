class ChatPreview {
  const ChatPreview({
    required this.id,
    required this.name,
    required this.message,
    required this.time,
    required this.unread,
    required this.details,
  });

  /// Placeholder slug. Future custom chat links can keep using this id.
  final String id;
  final String name;
  final String message;
  final String time;
  final int unread;
  final String details;
}

class ChatCatalog {
  const ChatCatalog._();

  static const List<ChatPreview> chats = [
    ChatPreview(
      id: 'alice',
      name: 'Alice',
      message: 'Ti va di fare una call?',
      time: '09:42',
      unread: 2,
      details:
          'Stiamo definendo i dettagli del briefing e ho bisogno del tuo ok finale prima di inviare il materiale.',
    ),
    ChatPreview(
      id: 'marco',
      name: 'Marco',
      message: 'Ho mandato i file finali.',
      time: 'Ieri',
      unread: 0,
      details:
          'Ho condiviso gli ultimi mockup e il file di checklist finale. Ti chiedo solo una verifica rapida.',
    ),
    ChatPreview(
      id: 'sofia',
      name: 'Sofia',
      message: 'Perfetto, lo vedo più tardi.',
      time: 'Lun',
      unread: 4,
      details:
          'Ho aggiornato la documentazione e il ticket con le note del meeting. Controllo finale nel pomeriggio.',
    ),
    ChatPreview(
      id: 'luca',
      name: 'Luca',
      message: 'Abbiamo un appuntamento alle 15:00.',
      time: 'Dom',
      unread: 1,
      details:
          'Ti aspetto alle 15:00 in ufficio per riassumere le azioni del sprint e i prossimi step.',
    ),
  ];

  static ChatPreview? byId(String id) {
    for (final chat in chats) {
      if (chat.id == id) return chat;
    }
    return null;
  }
}
