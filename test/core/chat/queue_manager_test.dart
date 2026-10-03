import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/queue/queue_job.dart';
import 'package:novyse/core/chat/queue/queue_manager.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

/// `QueueManager` is the seam between the UI, SQLite recovery and the per-chat
/// processors. These tests cover job construction, persistence, delegation and
/// the inbound-download bookkeeping that the existing `queue_test.dart` does
/// not reach.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase db;
  late QueueManager manager;

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();
    await db.chat.add({'uuid': 'chat-1', 'type': 'DM', 'name': 'Chat 1'});
    await db.chat.add({'uuid': 'chat-2', 'type': 'DM', 'name': 'Chat 2'});

    manager = QueueManager.instance;
    await manager.initialize(listenToConnectivity: false);
    manager.setConnected(false);
  });

  tearDown(() async {
    manager.dispose();
    await db.close();
  });

  Map<String, dynamic> message({String content = 'hi'}) => {
    'id': 1,
    'senderUUID': 'u1',
    'content': content,
  };

  group('addOutgoingMessageJob', () {
    test('persists the job and returns it', () async {
      final job = await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: message(),
      );

      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(job.id, 'm1');
      expect(job.type, JobType.outgoingMessage);
      // Offline, so the local phase runs and the job settles back to pending.
      expect(job.status, JobStatus.pending);
      expect(await db.job.get('m1'), isNotNull);
    });

    test('stamps the chat, sub and pending status onto the message', () async {
      await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        subID: 3,
        message: message(),
      );

      final stored = await db.message.get.by.id('chat-1', 3, 1);
      expect(stored?['chatUUID'], 'chat-1');
    });

    test('keeps textMessage priority for a text-only message', () async {
      final job = await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: message(),
      );

      expect(job.priority, JobPriority.textMessage);
    });

    test('demotes to fileUpload priority when files are attached', () async {
      final job = await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: message(),
        files: [
          {'uuid': 'f1', 'name': 'a.png'},
        ],
      );

      expect(job.priority, JobPriority.fileUpload);
    });

    test('demotes when the message itself carries files', () async {
      final job = await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: {
          ...message(),
          'files': [
            {'uuid': 'f1'},
          ],
        },
      );

      expect(job.priority, JobPriority.fileUpload);
    });

    test('leaves an explicit priority alone even with files', () async {
      final job = await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: message(),
        files: [
          {'uuid': 'f1'},
        ],
        priority: JobPriority.urgent,
      );

      expect(job.priority, JobPriority.urgent);
    });

    test('omits the files key from the payload when none are given', () async {
      final job = await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: message(),
      );

      expect(job.payload.containsKey('files'), isFalse);
    });

    test('routes the job to the chat processor', () async {
      await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-2',
        message: message(),
      );

      expect(manager.getProcessor('chat-2')!.jobs.map((j) => j.id), ['m1']);
    });
  });

  group('addEditMessageJob', () {
    test('persists an edit job with its payload', () async {
      await db.message.add({
        'id': 5,
        'chatUUID': 'chat-1',
        'subID': 0,
        'senderUUID': 'u1',
        'content': 'before',
      });

      final job = await manager.addEditMessageJob(
        id: 'e1',
        chatUUID: 'chat-1',
        messageID: '5',
        newContent: 'after',
        filesChanged: false,
      );

      expect(job.type, JobType.editMessage);
      expect(job.payload['messageID'], '5');
      expect(job.payload['content'], 'after');
      expect(job.payload['filesChanged'], isFalse);
      expect(await db.job.get('e1'), isNotNull);
    });

    test('applies the edit optimistically', () async {
      await db.message.add({
        'id': 5,
        'chatUUID': 'chat-1',
        'subID': 0,
        'senderUUID': 'u1',
        'content': 'before',
      });

      await manager.addEditMessageJob(
        id: 'e1',
        chatUUID: 'chat-1',
        messageID: '5',
        newContent: 'after',
        filesChanged: false,
      );

      final stored = await db.message.get.by.id('chat-1', 0, 5);
      expect(stored?['content'], 'after');
    });

    test('demotes priority when a brand new file is being uploaded', () async {
      final job = await manager.addEditMessageJob(
        id: 'e1',
        chatUUID: 'chat-1',
        messageID: '5',
        newContent: 'with file',
        files: [
          {'name': 'a.png'},
        ],
        filesChanged: true,
      );

      expect(job.priority, JobPriority.fileUpload);
    });

    test('keeps textMessage priority when the files already exist', () async {
      final job = await manager.addEditMessageJob(
        id: 'e1',
        chatUUID: 'chat-1',
        messageID: '5',
        newContent: 'reusing file',
        files: [
          {'uuid': 'f1', 'name': 'a.png'},
        ],
        filesChanged: false,
      );

      expect(job.priority, JobPriority.textMessage);
    });

    test('omits the files and originalMessage keys when absent', () async {
      final job = await manager.addEditMessageJob(
        id: 'e1',
        chatUUID: 'chat-1',
        messageID: '5',
        newContent: 'plain',
        filesChanged: false,
      );

      expect(job.payload.containsKey('files'), isFalse);
      expect(job.payload.containsKey('originalMessage'), isFalse);
    });

    test('keeps the original message for a rollback', () async {
      final job = await manager.addEditMessageJob(
        id: 'e1',
        chatUUID: 'chat-1',
        messageID: '5',
        newContent: 'new',
        filesChanged: true,
        originalMessage: {'content': 'old', 'files': []},
      );

      expect(job.payload['originalMessage'], {'content': 'old', 'files': []});
    });
  });

  group('addFileUploadJob', () {
    test('persists an upload job with the transfer details', () async {
      final job = await manager.addFileUploadJob(
        id: 'up1',
        chatUUID: 'chat-1',
        fileUUID: 'f1',
        uploadURL: 'https://s3.test/put',
        mimeType: 'image/png',
      );

      expect(job.type, JobType.fileUpload);
      expect(job.payload['fileUUID'], 'f1');
      expect(job.payload['uploadURL'], 'https://s3.test/put');
      expect(await db.job.get('up1'), isNotNull);
    });

    test(
      'records a null uri and bytes when the file is still being picked',
      () async {
        final job = await manager.addFileUploadJob(
          id: 'up1',
          chatUUID: 'chat-1',
          fileUUID: 'f1',
          uploadURL: 'https://s3.test/put',
        );

        expect(job.payload['uri'], isNull);
        expect(job.payload['bytes'], isNull);
      },
    );
  });

  group('addInboundDownloadJob', () {
    test('persists a download job with a dl_ prefixed id', () async {
      final job = await manager.addInboundDownloadJob(
        id: 'dl_f1',
        chatUUID: 'chat-1',
        fileUUID: 'f1',
        downloadURL: 'https://s3.test/get',
        name: 'a.png',
      );

      expect(job.type, JobType.fileDownload);
      expect(job.priority, JobPriority.background);
      expect(job.payload['downloadURL'], 'https://s3.test/get');
      expect(job.payload['name'], 'a.png');
      expect(await db.job.get('dl_f1'), isNotNull);
    });

    test('omits the downloadURL and name when absent', () async {
      final job = await manager.addInboundDownloadJob(
        id: 'dl_f1',
        chatUUID: 'chat-1',
        fileUUID: 'f1',
      );

      expect(job.payload.containsKey('downloadURL'), isFalse);
      expect(job.payload.containsKey('name'), isFalse);
    });
  });

  group('pause and resume', () {
    test('pauses through the chat processor', () async {
      await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: message(),
      );

      expect(manager.pauseJob('m1', 'chat-1'), isTrue);
      expect(
        manager.getProcessor('chat-1')!.jobs.single.status,
        JobStatus.paused,
      );
    });

    test('returns false for an unknown chat', () {
      expect(manager.pauseJob('m1', 'nope'), isFalse);
    });

    test('resumes through the chat processor', () async {
      final job = await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: message(content: 'old'),
      );
      manager.pauseJob('m1', 'chat-1');

      expect(manager.resumeAndModifyJob('m1', 'chat-1', 'new'), isTrue);
      expect(
        manager
            .getProcessor('chat-1')!
            .jobs
            .single
            .payload['message']['content'],
        'new',
      );
      expect(job.id, 'm1');
    });

    test('returns false for an unknown chat on resume', () {
      expect(manager.resumeAndModifyJob('m1', 'nope'), isFalse);
    });
  });

  group('cancelJob', () {
    test('removes the job from the processor and the database', () async {
      await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: message(),
      );

      await manager.cancelJob('m1', 'chat-1');

      expect(manager.getProcessor('chat-1')!.jobs, isEmpty);
      expect(await db.job.get('m1'), isNull);
    });

    test('is a no-op for an unknown chat', () async {
      await expectLater(manager.cancelJob('m1', 'nope'), completes);
    });
  });

  group('cancelFileTransfer', () {
    test('propagates to every chat processor', () async {
      await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: {
          ...message(),
          'files': [
            {'uuid': 'f1'},
          ],
        },
      );
      await manager.addOutgoingMessageJob(
        id: 'm2',
        chatUUID: 'chat-2',
        message: {
          ...message(),
          'files': [
            {'uuid': 'f1'},
          ],
        },
      );

      await manager.cancelFileTransfer('f1');

      // The optimistic `message:new` emission also queues a `dl_f1` download
      // job in each chat, so look the outgoing job up by id.
      final one = manager
          .getProcessor('chat-1')!
          .jobs
          .firstWhere((j) => j.id == 'm1')
          .payload;
      final two = manager
          .getProcessor('chat-2')!
          .jobs
          .firstWhere((j) => j.id == 'm2')
          .payload;
      expect((one['files']! as List), isEmpty);
      expect((two['files']! as List), isEmpty);
      expect((one['message']! as Map)['files'], isEmpty);
      expect((two['message']! as Map)['files'], isEmpty);
    });
  });

  group('enqueueInboundFileDownloads', () {
    test('queues one download per file', () async {
      await manager.enqueueInboundFileDownloads('chat-1', [
        {'uuid': 'f1', 'downloadURL': 'https://s3/1', 'name': 'a.png'},
        {'uuid': 'f2', 'downloadURL': 'https://s3/2', 'name': 'b.png'},
      ]);

      final jobs = manager.getProcessor('chat-1')!.jobs;
      expect(jobs.map((j) => j.id), containsAll(['dl_f1', 'dl_f2']));
    });

    test('skips entries without a uuid and non-map entries', () async {
      await manager.enqueueInboundFileDownloads('chat-1', [
        'nope',
        42,
        {'name': 'no uuid'},
        {'uuid': ''},
        {'uuid': 'f1'},
      ]);

      expect(manager.getProcessor('chat-1')!.jobs.map((j) => j.id), ['dl_f1']);
    });

    test(
      'skips a file that already has a local copy when onlyMissing',
      () async {
        await db.file.add(
          'f1',
          'a.png',
          'image/png',
          10,
          ref: 'file:///local/a.png',
        );

        await manager.enqueueInboundFileDownloads('chat-1', [
          {'uuid': 'f1'},
          {'uuid': 'f2'},
        ], onlyMissing: true);

        expect(manager.getProcessor('chat-1')!.jobs.map((j) => j.id), [
          'dl_f2',
        ]);
      },
    );

    test('re-downloads an existing file when onlyMissing is off', () async {
      await db.file.add(
        'f1',
        'a.png',
        'image/png',
        10,
        ref: 'file:///local/a.png',
      );

      await manager.enqueueInboundFileDownloads('chat-1', [
        {'uuid': 'f1'},
      ]);

      expect(manager.getProcessor('chat-1')!.jobs.map((j) => j.id), ['dl_f1']);
    });

    test('treats an empty stored ref as missing', () async {
      await db.file.add('f1', 'a.png', 'image/png', 10);

      await manager.enqueueInboundFileDownloads('chat-1', [
        {'uuid': 'f1'},
      ], onlyMissing: true);

      expect(manager.getProcessor('chat-1')!.jobs.map((j) => j.id), ['dl_f1']);
    });
  });

  group('inbound event listeners', () {
    test('a new message with files queues the downloads', () async {
      GlobalEventEmitter.instance.emit('message:new', {
        'chatUUID': 'chat-1',
        'files': [
          {'uuid': 'f1'},
        ],
      });
      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(manager.getProcessor('chat-1')!.jobs.map((j) => j.id), ['dl_f1']);
    });

    test('a new message without files queues nothing', () async {
      GlobalEventEmitter.instance.emit('message:new', {
        'chatUUID': 'chat-1',
        'files': <dynamic>[],
      });
      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(manager.getProcessor('chat-1'), isNull);
    });

    test('a new message without a chat uuid queues nothing', () async {
      GlobalEventEmitter.instance.emit('message:new', {
        'files': [
          {'uuid': 'f1'},
        ],
      });
      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(manager.getProcessor('chat-1'), isNull);
    });

    test('a non-map new message is ignored', () async {
      GlobalEventEmitter.instance.emit('message:new', 'nope');
      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(manager.getProcessor('chat-1'), isNull);
    });

    test('an edit with new files queues the downloads', () async {
      GlobalEventEmitter.instance.emit('message:update', {
        'chatUUID': 'chat-1',
        'action': 'edit',
        'files': [
          {'uuid': 'f9'},
        ],
      });
      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(manager.getProcessor('chat-1')!.jobs.map((j) => j.id), ['dl_f9']);
    });

    test('a non-edit update is ignored', () async {
      GlobalEventEmitter.instance.emit('message:update', {
        'chatUUID': 'chat-1',
        'action': 'delete',
        'files': [
          {'uuid': 'f9'},
        ],
      });
      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(manager.getProcessor('chat-1'), isNull);
    });
  });

  group('connectivity', () {
    test('reports the current state', () {
      manager.setConnected(true);
      expect(manager.isConnected, isTrue);

      manager.setConnected(false);
      expect(manager.isConnected, isFalse);
    });

    test('propagates the state to existing processors', () async {
      await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: message(),
      );
      final processor = manager.getProcessor('chat-1')!;

      manager.setConnected(true);
      expect(processor.isConnected, isTrue);

      manager.setConnected(false);
      expect(processor.isConnected, isFalse);
    });

    test('gives a newly created processor the current state', () async {
      manager.setConnected(true);

      await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-2',
        message: message(),
      );

      expect(manager.getProcessor('chat-2')!.isConnected, isTrue);
    });

    test('ignores a repeated state', () async {
      await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: message(),
      );

      // A second setConnected(false) is a no-op, so the processor is untouched.
      manager.setConnected(false);
      expect(manager.getProcessor('chat-1')!.isConnected, isFalse);
    });
  });

  group('lifecycle', () {
    test('initialize is idempotent', () async {
      await manager.initialize(listenToConnectivity: false);

      expect(manager.getProcessor('chat-1'), isNull);
    });

    test('recovers pending jobs from the database', () async {
      await db.job.save(
        QueueJob(
          id: 'recovered',
          chatUUID: 'chat-2',
          type: JobType.outgoingMessage,
          status: JobStatus.pending,
          payload: const {'content': 'x'},
        ).toMap(),
      );

      manager.dispose();
      await manager.initialize(listenToConnectivity: false);

      expect(manager.getProcessor('chat-2')!.jobs.map((j) => j.id), [
        'recovered',
      ]);
    });

    test('dispose clears the processors and resets the flag', () async {
      await manager.addOutgoingMessageJob(
        id: 'm1',
        chatUUID: 'chat-1',
        message: message(),
      );
      final processor = manager.getProcessor('chat-1')!;

      manager.dispose();

      expect(processor.isDisposed, isTrue);
      expect(manager.getProcessor('chat-1'), isNull);
    });
  });

  group('showStatusError', () {
    test('is a no-op without an attached ref', () {
      expect(() => manager.showStatusError('boom'), returnsNormally);
    });
  });
}
