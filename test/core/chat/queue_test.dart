import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:novyse/core/chat/chat.dart';
import 'package:novyse/core/storage/database/database.dart';

void main() {
  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  late AppDatabase db;
  late QueueManager queueManager;

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();

    // Create test chats
    await db.chat.add({'uuid': 'chat-1', 'type': 'DM', 'name': 'Chat 1'});
    await db.chat.add({'uuid': 'chat-2', 'type': 'DM', 'name': 'Chat 2'});

    queueManager = QueueManager.instance;
    await queueManager.initialize(listenToConnectivity: false);
    queueManager.setConnected(false);
  });

  tearDown(() async {
    queueManager.dispose();
    await db.close();
  });

  group('Queue System & Multi-Chat Queue Tests', () {
    test('creates separate ChatQueueProcessors for different chats (parallel execution)', () async {
      await queueManager.addOutgoingMessageJob(
        id: 'msg-c1',
        chatUUID: 'chat-1',
        message: {
          'id': 1,
          'chatUUID': 'chat-1',
          'senderUUID': '00000000-0000-0000-0000-000000000000',
          'content': 'Message for chat 1',
        },
      );

      await queueManager.addOutgoingMessageJob(
        id: 'msg-c2',
        chatUUID: 'chat-2',
        message: {
          'id': 2,
          'chatUUID': 'chat-2',
          'senderUUID': '00000000-0000-0000-0000-000000000000',
          'content': 'Message for chat 2',
        },
      );

      final p1 = queueManager.getProcessor('chat-1');
      final p2 = queueManager.getProcessor('chat-2');

      expect(p1, isNotNull);
      expect(p2, isNotNull);
      expect(p1, isNot(same(p2)));
      expect(p1!.jobs.length, equals(1));
      expect(p2!.jobs.length, equals(1));
    });

    test('prioritizes urgent and text message jobs over background file jobs in same chat', () async {
      final processor = ChatQueueProcessor(chatUUID: 'chat-1');

      final fileJob = QueueJob(
        id: 'job-file',
        chatUUID: 'chat-1',
        type: JobType.fileUpload,
        priority: JobPriority.fileUpload, // 10
        payload: {'fileUUID': 'f1'},
      );

      final textJob = QueueJob(
        id: 'job-text',
        chatUUID: 'chat-1',
        type: JobType.outgoingMessage,
        priority: JobPriority.textMessage, // 50
        payload: {'content': 'Regular text'},
      );

      final urgentJob = QueueJob(
        id: 'job-urgent',
        chatUUID: 'chat-1',
        type: JobType.outgoingMessage,
        priority: JobPriority.urgent, // 100
        payload: {'content': 'Urgent notification'},
      );

      processor.addJob(fileJob);
      processor.addJob(textJob);
      processor.addJob(urgentJob);

      expect(processor.jobs[0].id, equals('job-urgent'));
      expect(processor.jobs[1].id, equals('job-text'));
      expect(processor.jobs[2].id, equals('job-file'));
    });

    test(
      'pauseJob and resumeAndModifyJob works and persists in database',
      () async {
        await queueManager.addOutgoingMessageJob(
          id: 'msg-pause',
          chatUUID: 'chat-1',
          message: {
            'id': 10,
            'chatUUID': 'chat-1',
            'senderUUID': '00000000-0000-0000-0000-000000000000',
            'content': 'Original text',
          },
        );

        // Pause job
        final paused = queueManager.pauseJob('msg-pause', 'chat-1');
        expect(paused, isTrue);

        final pausedInDb = await db.job.get('msg-pause');
        expect(pausedInDb!['status'], equals('PAUSED'));

        // Resume and modify text
        final resumed = queueManager.resumeAndModifyJob(
          'msg-pause',
          'chat-1',
          'Modified text content',
        );
        expect(resumed, isTrue);

        final resumedInDb = await db.job.get('msg-pause');
        expect(resumedInDb!['status'], equals('PENDING'));
        expect(
          resumedInDb['payload']['content'],
          equals('Modified text content'),
        );
      },
    );

    test(
      'cancelFileTransfer removes file from job and cancels job if empty',
      () async {
        await queueManager.addOutgoingMessageJob(
          id: 'msg-with-file',
          chatUUID: 'chat-1',
          message: {
            'id': 20,
            'chatUUID': 'chat-1',
            'senderUUID': '00000000-0000-0000-0000-000000000000',
            'content': '',
            'files': [
              {'uuid': 'file-to-cancel', 'name': 'photo.png'},
            ],
          },
        );

        await queueManager.cancelFileTransfer('file-to-cancel');

        final jobInDb = await db.job.get('msg-with-file');
        expect(
          jobInDb,
          isNull,
        ); // Cancelled completely since it had no other text content
      },
    );

    test('recovers pending jobs on app initialization', () async {
      // 1. Manually insert pending and processing jobs
      await db.job.save({
        'id': 'job-recover-1',
        'chat_uuid': 'chat-1',
        'job_type': 'OUTGOING_MESSAGE',
        'priority': 50,
        'status': 'PROCESSING', // Simulating crash during processing
        'payload': {
          'id': 31,
          'chatUUID': 'chat-1',
          'senderUUID': '00000000-0000-0000-0000-000000000000',
          'content': 'Recover me',
        },
      });

      await db.job.save({
        'id': 'job-recover-2',
        'chat_uuid': 'chat-1',
        'job_type': 'OUTGOING_MESSAGE',
        'priority': 50,
        'status': 'PENDING',
        'payload': {
          'id': 32,
          'chatUUID': 'chat-1',
          'senderUUID': '00000000-0000-0000-0000-000000000000',
          'content': 'Recover me 2',
        },
      });

      // 2. Re-initialize QueueManager
      queueManager.dispose();
      queueManager = QueueManager.instance;
      await queueManager.initialize(listenToConnectivity: false);

      final processor = queueManager.getProcessor('chat-1');
      expect(processor, isNotNull);
      expect(processor!.jobs.length, equals(2));
    });

    test('handles offline network state gracefully', () async {
      queueManager.setConnected(false);
      expect(queueManager.isConnected, isFalse);

      final processor =
          queueManager.getProcessor('chat-1') ??
          ChatQueueProcessor(chatUUID: 'chat-1');
      processor.isConnected = false;

      final job = QueueJob(
        id: 'job-offline',
        chatUUID: 'chat-1',
        type: JobType.outgoingMessage,
        priority: JobPriority.textMessage,
        payload: {
          'id': 101,
          'chatUUID': 'chat-1',
          'subID': 0,
          'senderUUID': '00000000-0000-0000-0000-000000000000',
          'content': 'Offline message',
        },
      );

      processor.addJob(job);
      processor.triggerProcess();

      // Wait for async local DB write and offline check
      await Future.delayed(const Duration(milliseconds: 100));
      expect(job.status, equals(JobStatus.pending));

      // Message is optimistically saved in local DB even while offline
      final localMsg = await db.message.get.by.id('chat-1', 0, 101);
      expect(localMsg, isNotNull);
      expect(localMsg!['content'], equals('Offline message'));

      // Reconnect
      queueManager.setConnected(true);
      expect(queueManager.isConnected, isTrue);
    });
  });
}
