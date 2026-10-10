import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_models.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_recents_store.dart';
import 'package:novyse/ui/components/chat/emoji_menu/gif/gif_send_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

const _gif = GifItem(
  id: 'g1',
  provider: 'klipy',
  url: 'https://cdn.example/g1.gif',
  previewUrl: 'https://cdn.example/g1_preview.gif',
);

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  late AppDatabase db;
  late QueueManager queueManager;

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();

    queueManager = QueueManager.instance;
    await queueManager.initialize(listenToConnectivity: false);
    queueManager.setConnected(false);
  });

  tearDown(() async {
    queueManager.dispose();
    await db.clear();
  });

  test('sendGif queues a message and records the recent', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final container = ProviderContainer(
      overrides: [
        queueManagerProvider.overrideWithValue(queueManager),
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
    );
    addTearDown(container.dispose);

    await GifSendHandler.sendGif(
      ref: container,
      chatUUID: 'chat-gif-send',
      subID: 0,
      gif: _gif,
    );

    // Queued via per-chat processor (offline -> paused, like keyboard GIF).
    expect(queueManager.getProcessor('chat-gif-send'), isNotNull);
    // Saved to persisted recents.
    expect(container.read(gifRecentsProvider).map((g) => g.id), ['g1']);
  });
}
