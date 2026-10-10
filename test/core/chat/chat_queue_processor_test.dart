import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/chat/queue/chat_queue_processor.dart';
import 'package:novyse/core/chat/queue/queue_job.dart';
import 'package:novyse/core/events/events.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

import '../../helpers/event_collector.dart';

/// Exercises the queue bookkeeping that does not need a network: ordering,
/// preemption-free bookkeeping, pause/resume, file-transfer cancellation and
/// the offline (phase-1-only) execution path.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AppDatabase db;
  late EventCollector bus;

  setUpAll(() {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  });

  setUp(() async {
    db = AppDatabase.instance;
    await db.initialize(inMemory: true);
    await db.clear();
    await db.chat.add({'uuid': 'chat-1', 'type': 'DM', 'name': 'Chat 1'});
    bus = EventCollector.start(
      namedEvents: const ['message:failed', 'message:update'],
    );
  });

  tearDown(() async {
    await bus.stop();
    await db.close();
  });

  /// A processor pinned offline, so execution stops after the local phase.
  ChatQueueProcessor offlineProcessor() =>
      ChatQueueProcessor(chatUUID: 'chat-1')..isConnected = false;

  QueueJob job({
    required String id,
    JobType type = JobType.outgoingMessage,
    int priority = JobPriority.textMessage,
    JobStatus status = JobStatus.paused,
    Map<String, dynamic>? payload,
    DateTime? createdAt,
  }) => QueueJob(
    id: id,
    chatUUID: 'chat-1',
    type: type,
    priority: priority,
    status: status,
    payload: payload ?? {'content': 'body $id'},
    createdAt: createdAt ?? DateTime(2026, 1, 1),
  );

  group('addJob', () {
    test('stores the job', () {
      final processor = offlineProcessor();
      processor.addJob(job(id: 'a'));

      expect(processor.jobs.map((j) => j.id), ['a']);
    });

    test('sorts by descending priority', () {
      final processor = offlineProcessor();
      processor.addJob(job(id: 'low', priority: JobPriority.fileUpload));
      processor.addJob(job(id: 'high', priority: JobPriority.urgent));
      processor.addJob(job(id: 'mid', priority: JobPriority.textMessage));

      expect(processor.jobs.map((j) => j.id), ['high', 'mid', 'low']);
    });

    test('breaks priority ties by creation time', () {
      final processor = offlineProcessor();
      processor.addJob(job(id: 'later', createdAt: DateTime(2026, 1, 2)));
      processor.addJob(job(id: 'earlier', createdAt: DateTime(2026, 1, 1)));

      expect(processor.jobs.map((j) => j.id), ['earlier', 'later']);
    });

    test('replaces a job that shares an id', () {
      final processor = offlineProcessor();
      processor.addJob(job(id: 'a', payload: {'content': 'first'}));
      processor.addJob(job(id: 'a', payload: {'content': 'second'}));

      expect(processor.jobs, hasLength(1));
      expect(processor.jobs.single.payload['content'], 'second');
    });

    test('is a no-op after dispose', () {
      final processor = offlineProcessor()..dispose();
      processor.addJob(job(id: 'a'));

      expect(processor.jobs, isEmpty);
    });

    test('does not start processing a paused job', () {
      final processor = offlineProcessor();
      processor.addJob(job(id: 'a', status: JobStatus.paused));

      expect(processor.isProcessing, isFalse);
      expect(processor.currentJob, isNull);
    });
  });

  group('removeJob', () {
    test('removes the job', () {
      final processor = offlineProcessor();
      processor.addJob(job(id: 'a'));
      processor.addJob(job(id: 'b'));

      processor.removeJob('a');

      expect(processor.jobs.map((j) => j.id), ['b']);
    });

    test('ignores an unknown id', () {
      final processor = offlineProcessor();
      processor.addJob(job(id: 'a'));

      processor.removeJob('nope');

      expect(processor.jobs, hasLength(1));
    });

    test('leaves other jobs alone when removing one', () {
      final processor = offlineProcessor();
      final withToken = job(id: 'a')..cancelToken = CancelToken();
      processor.addJob(withToken);
      processor.addJob(job(id: 'b'));

      processor.removeJob('a');

      expect(processor.jobs.map((j) => j.id), ['b']);
    });
  });

  group('pauseJob', () {
    test('marks the job paused and persists it', () async {
      final processor = offlineProcessor();
      processor.addJob(job(id: 'a', status: JobStatus.pending));
      await db.job.save(job(id: 'a').toMap());

      expect(processor.pauseJob('a'), isTrue);
      expect(processor.jobs.single.status, JobStatus.paused);
      expect((await db.job.get('a'))?['status'], JobStatus.paused.value);
    });

    test('returns false for an unknown id', () {
      expect(offlineProcessor().pauseJob('nope'), isFalse);
    });
  });

  group('resumeAndModifyJob', () {
    test('returns the job to pending and persists it', () async {
      final processor = offlineProcessor();
      processor.addJob(job(id: 'a', status: JobStatus.paused));
      await db.job.save(job(id: 'a').toMap());

      expect(processor.resumeAndModifyJob('a'), isTrue);
      await bus.settle();

      // Offline, so the job runs the local phase and returns to pending.
      expect(processor.jobs.single.status, JobStatus.pending);
      expect((await db.job.get('a'))?['status'], JobStatus.pending.value);
    });

    test('replaces the content in the payload', () async {
      final processor = offlineProcessor();
      processor.addJob(
        job(id: 'a', status: JobStatus.paused, payload: {'content': 'old'}),
      );
      await db.job.save(job(id: 'a').toMap());

      processor.resumeAndModifyJob('a', 'new');

      expect(processor.jobs.single.payload['content'], 'new');
    });

    test('also replaces the content nested in the message', () {
      final processor = offlineProcessor();
      processor.addJob(
        job(
          id: 'a',
          status: JobStatus.paused,
          payload: {
            'content': 'old',
            'message': {'content': 'old', 'chatUUID': 'chat-1'},
          },
        ),
      );

      processor.resumeAndModifyJob('a', 'new');

      final payload = processor.jobs.single.payload;
      expect(payload['content'], 'new');
      expect((payload['message']! as Map)['content'], 'new');
    });

    test('leaves the payload alone when no content is given', () async {
      final processor = offlineProcessor();
      processor.addJob(
        job(id: 'a', status: JobStatus.paused, payload: {'content': 'keep'}),
      );

      expect(processor.resumeAndModifyJob('a'), isTrue);
      expect(processor.jobs.single.payload['content'], 'keep');
    });

    test('returns false for an unknown id', () {
      expect(offlineProcessor().resumeAndModifyJob('nope'), isFalse);
    });
  });

  group('cancelFileTransfer', () {
    test(
      'drops the job when the last file goes and there is no text',
      () async {
        final processor = offlineProcessor();
        processor.addJob(
          job(
            id: 'a',
            status: JobStatus.pending,
            payload: {
              'content': '',
              'message': {
                'content': '',
                'files': [
                  {'uuid': 'f1'},
                ],
              },
            },
          ),
        );
        await db.job.save(job(id: 'a').toMap());

        await processor.cancelFileTransfer('f1');

        expect(processor.jobs, isEmpty);
        expect(await db.job.get('a'), isNull);
        expect(bus.singleNamed('message:failed'), {
          'tempId': 'a',
          'error': 'File transfer cancelled',
        });
      },
    );

    test('keeps the job when the text is not empty', () async {
      final processor = offlineProcessor();
      processor.addJob(
        job(
          id: 'a',
          status: JobStatus.paused,
          payload: {
            'content': 'look at this',
            'message': {
              'content': 'look at this',
              'files': [
                {'uuid': 'f1'},
              ],
            },
          },
        ),
      );

      await processor.cancelFileTransfer('f1');

      expect(processor.jobs, hasLength(1));
      expect(bus.named('message:failed'), isEmpty);
      expect(bus.singleNamed('message:update'), {
        'chatUUID': 'chat-1',
        'messageID': 'a',
        'action': 'edit',
        'data': {'files': isEmpty},
      });
    });

    test('removes only the matching file', () async {
      final processor = offlineProcessor();
      processor.addJob(
        job(
          id: 'a',
          status: JobStatus.paused,
          payload: {
            'files': [
              {'uuid': 'f1'},
              {'uuid': 'f2'},
            ],
          },
        ),
      );
      await db.job.save(job(id: 'a').toMap());

      await processor.cancelFileTransfer('f1');

      final files = (processor.jobs.single.payload['files']! as List)
          .cast<Map>();
      expect(files, hasLength(1));
      expect(files.single['uuid'], 'f2');
    });

    test('ignores a file the job does not reference', () async {
      final processor = offlineProcessor();
      processor.addJob(
        job(
          id: 'a',
          status: JobStatus.paused,
          payload: {
            'content': 'keep',
            'files': [
              {'uuid': 'f1'},
            ],
          },
        ),
      );

      await processor.cancelFileTransfer('other');

      expect((processor.jobs.single.payload['files']! as List).length, 1);
      expect((bus.singleNamed('message:update')! as Map)['data'], {
        'files': [
          {'uuid': 'f1'},
        ],
      });
    });

    test('skips a job with no files at all', () async {
      final processor = offlineProcessor();
      processor.addJob(
        job(id: 'a', status: JobStatus.paused, payload: {'content': 'text'}),
      );

      await processor.cancelFileTransfer('f1');

      expect(processor.jobs, hasLength(1));
      expect(bus.named('message:update'), isEmpty);
    });
  });

  group('dispose', () {
    test('clears the queue and flags itself disposed', () {
      final processor = offlineProcessor();
      processor.addJob(job(id: 'a'));

      processor.dispose();

      expect(processor.isDisposed, isTrue);
      expect(processor.jobs, isEmpty);
      expect(processor.currentJob, isNull);
    });

    test('triggerProcess becomes a no-op', () {
      final processor = offlineProcessor()..dispose();
      processor.addJob(job(id: 'a', status: JobStatus.pending));

      processor.triggerProcess();

      expect(processor.isProcessing, isFalse);
    });
  });

  group('offline execution (phase 1 only)', () {
    test('persists the message locally with a pending status', () async {
      final processor = offlineProcessor();
      processor.addJob(
        job(
          id: 'a',
          status: JobStatus.pending,
          payload: {
            'message': {
              'id': 1,
              'senderUUID': 'u1',
              'content': 'offline hello',
            },
          },
        ),
      );

      processor.triggerProcess();
      await bus.settle();

      final stored = await db.message.get.by.id('chat-1', 0, 1);
      expect(stored?['content'], 'offline hello');
      expect(bus.single<MessageNewEvent>().message['status'], 'PENDING_SEND');
    });

    test('emits the optimistic message event', () async {
      final processor = offlineProcessor();
      processor.addJob(
        job(
          id: 'a',
          status: JobStatus.pending,
          payload: {
            'message': {
              'id': 1,
              'senderUUID': 'u1',
              'content': 'offline hello',
            },
          },
        ),
      );

      processor.triggerProcess();
      await bus.settle();

      expect(bus.single<MessageNewEvent>().message['content'], 'offline hello');
    });

    test(
      'puts the job back to pending so it retries when back online',
      () async {
        final processor = offlineProcessor();
        processor.addJob(
          job(
            id: 'a',
            status: JobStatus.pending,
            payload: {
              'message': {
                'id': 1,
                'senderUUID': 'u1',
                'content': 'offline hello',
              },
            },
          ),
        );
        await db.job.save(job(id: 'a').toMap());

        processor.triggerProcess();
        await bus.settle();

        expect(processor.jobs.single.status, JobStatus.pending);
        expect((await db.job.get('a'))?['status'], JobStatus.pending.value);
      },
    );

    test('stamps the chatUUID and subID onto the message', () async {
      final processor = offlineProcessor();
      final withSub = QueueJob(
        id: 'a',
        chatUUID: 'chat-1',
        subID: 4,
        type: JobType.outgoingMessage,
        status: JobStatus.pending,
        payload: {
          'message': {'id': 1, 'senderUUID': 'u1', 'content': 'in a sub'},
        },
        createdAt: DateTime(2026, 1, 1),
      );
      processor.addJob(withSub);

      processor.triggerProcess();
      await bus.settle();

      final stored = await db.message.get.by.id('chat-1', 4, 1);
      expect(stored?['content'], 'in a sub');
    });
  });

  group('queue job serialization', () {
    test('round-trips through toMap/fromMap', () {
      final original = QueueJob(
        id: 'a',
        chatUUID: 'chat-1',
        subID: 2,
        type: JobType.fileUpload,
        priority: JobPriority.urgent,
        status: JobStatus.failed,
        payload: const {'content': 'x'},
        progress: 0.5,
        attempts: 3,
        maxRetries: 7,
        errorMessage: 'boom',
        createdAt: DateTime(2026, 1, 1),
      );

      final restored = QueueJob.fromMap(original.toMap());

      expect(restored.id, 'a');
      expect(restored.chatUUID, 'chat-1');
      expect(restored.subID, 2);
      expect(restored.type, JobType.fileUpload);
      expect(restored.priority, JobPriority.urgent);
      expect(restored.status, JobStatus.failed);
      expect(restored.payload, {'content': 'x'});
      expect(restored.progress, 0.5);
      expect(restored.attempts, 3);
      expect(restored.maxRetries, 7);
      expect(restored.errorMessage, 'boom');
    });

    test('falls back to defaults for a sparse row', () {
      final restored = QueueJob.fromMap(const {'id': 'a'});

      expect(restored.chatUUID, '');
      expect(restored.subID, 0);
      expect(restored.type, JobType.outgoingMessage);
      expect(restored.status, JobStatus.pending);
      expect(restored.priority, JobPriority.fileUpload);
      expect(restored.payload, isEmpty);
    });

    test('survives an undecodable payload', () {
      final restored = QueueJob.fromMap(const {'id': 'a', 'payload': '{oops'});

      expect(restored.payload, isEmpty);
    });

    test('status parsing is case-insensitive', () {
      expect(JobStatus.fromString('paused'), JobStatus.paused);
      expect(JobStatus.fromString('PAUSED'), JobStatus.paused);
      expect(JobStatus.fromString('bogus'), JobStatus.pending);
      expect(JobStatus.fromString(null), JobStatus.pending);
    });

    test('type parsing is case-insensitive', () {
      expect(JobType.fromString('file_upload'), JobType.fileUpload);
      expect(JobType.fromString('FILE_UPLOAD'), JobType.fileUpload);
      expect(JobType.fromString('bogus'), JobType.outgoingMessage);
      expect(JobType.fromString(null), JobType.outgoingMessage);
    });

    test('copyWith keeps the cancel token and overrides the rest', () {
      final original = job(id: 'a')..cancelToken = CancelToken();

      final copy = original.copyWith(status: JobStatus.completed);

      expect(copy.id, 'a');
      expect(copy.status, JobStatus.completed);
      expect(identical(copy.cancelToken, original.cancelToken), isTrue);
    });

    test('exposes the status shortcuts', () {
      expect(job(id: 'a', status: JobStatus.completed).isCompleted, isTrue);
      expect(job(id: 'a', status: JobStatus.failed).isFailed, isTrue);
      expect(job(id: 'a', status: JobStatus.paused).isPaused, isTrue);
      expect(job(id: 'a', status: JobStatus.processing).isProcessing, isTrue);
      expect(job(id: 'a', status: JobStatus.pending).isPending, isTrue);
    });
  });
}
