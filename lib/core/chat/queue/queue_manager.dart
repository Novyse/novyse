import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:novyse/core/chat/queue/chat_queue_processor.dart';
import 'package:novyse/core/chat/queue/queue_job.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/stores/network_store.dart';

/// Central manager orchestrating per-chat queues, app startup recovery, and network state.
class QueueManager {
  QueueManager._();
  static final QueueManager instance = QueueManager._();

  final Map<String, ChatQueueProcessor> _processors = {};
  bool _initialized = false;
  bool _isConnected = true;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  bool get isConnected => _isConnected;

  /// Initializes the QueueManager, recovering unfinished jobs from SQLite.
  Future<void> initialize({Ref? ref, bool listenToConnectivity = true}) async {
    if (_initialized) return;
    _initialized = true;

    // 1. Reset interrupted processing jobs back to pending
    await AppDatabase.instance.job.resetProcessingToPending();

    // 2. Load pending and paused jobs from SQLite
    final pendingJobRows = await AppDatabase.instance.job.getPendingJobs();
    for (final row in pendingJobRows) {
      final job = QueueJob.fromMap(row);
      final processor = _getOrCreateProcessor(job.chatUUID);
      processor.addJob(job);
    }

    // 3. Monitor network connectivity via network store or connectivity_plus
    if (listenToConnectivity) {
      if (ref != null) {
        ref.listen<NetworkState>(networkProvider, (previous, next) {
          setConnected(next.isConnected && next.isSynced);
        }, fireImmediately: true);
      } else {
        _checkInitialConnectivity();
        _connectivitySubscription = Connectivity().onConnectivityChanged.listen(
          (results) {
            final connected = results.any((r) => r != ConnectivityResult.none);
            setConnected(connected);
          },
        );
      }
    }

    // 4. Listen for inbound messages with files to trigger downloads if configured
    GlobalEventEmitter.instance.on('message:new', _handleNewInboundMessage);

    // 5. Trigger all chat processors
    _triggerAllProcessors();
    debugPrint(
      '[QueueManager] Initialized with ${pendingJobRows.length} recovered jobs.',
    );
  }

  /// Sets connectivity state and notifies all per-chat processors.
  void setConnected(bool connected) {
    if (_isConnected != connected) {
      _isConnected = connected;
      debugPrint(
        '[QueueManager] Connection changed: ${_isConnected ? "ONLINE" : "OFFLINE"}',
      );
      for (final processor in _processors.values) {
        processor.isConnected = _isConnected;
        if (_isConnected) {
          processor.triggerProcess();
        }
      }
    }
  }

  /// Adds an outgoing message job to the chat's queue and persists it.
  Future<QueueJob> addOutgoingMessageJob({
    required String id,
    required String chatUUID,
    int subID = 0,
    required Map<String, dynamic> message,
    int priority = JobPriority.textMessage,
    List<Map<String, dynamic>>? files,
  }) async {
    // If the message contains files, adjust priority if not explicitly urgent
    final hasFiles =
        (files != null && files.isNotEmpty) ||
        (message['files'] is List && (message['files'] as List).isNotEmpty);
    final effectivePriority = hasFiles && priority == JobPriority.textMessage
        ? JobPriority.fileUpload
        : priority;

    final job = QueueJob(
      id: id,
      chatUUID: chatUUID,
      subID: subID,
      type: JobType.outgoingMessage,
      priority: effectivePriority,
      status: JobStatus.pending,
      payload: {'message': message, 'files': ?files},
    );

    // Persist in DB
    await AppDatabase.instance.job.save(job.toMap());

    // Optimistically save message to DB and broadcast to UI immediately
    message['chatUUID'] = chatUUID;
    message['subID'] = subID;
    message['status'] = 'PENDING_SEND';
    await GlobalEventEmitter.instance.message.add(message);

    // Dispatch to per-chat queue
    final processor = _getOrCreateProcessor(chatUUID);
    processor.addJob(job);
    processor.triggerProcess();

    return job;
  }

  /// Adds a file upload job to the chat's queue.
  Future<QueueJob> addFileUploadJob({
    required String id,
    required String chatUUID,
    required String fileUUID,
    required String uploadURL,
    Uint8List? bytes,
    String? uri,
    String? mimeType,
    int priority = JobPriority.fileUpload,
  }) async {
    final job = QueueJob(
      id: id,
      chatUUID: chatUUID,
      type: JobType.fileUpload,
      priority: priority,
      payload: {
        'fileUUID': fileUUID,
        'uploadURL': uploadURL,
        'bytes': bytes,
        'uri': uri,
        'mimeType': mimeType,
      },
    );

    await AppDatabase.instance.job.save(job.toMap());

    final processor = _getOrCreateProcessor(chatUUID);
    processor.addJob(job);
    processor.triggerProcess();

    return job;
  }

  /// Adds an inbound file download job to the chat's queue.
  Future<QueueJob> addInboundDownloadJob({
    required String id,
    required String chatUUID,
    required String fileUUID,
    required String downloadURL,
    String? name,
    int priority = JobPriority.background,
  }) async {
    final job = QueueJob(
      id: id,
      chatUUID: chatUUID,
      type: JobType.fileDownload,
      priority: priority,
      payload: {'fileUUID': fileUUID, 'downloadURL': downloadURL, 'name': name},
    );

    await AppDatabase.instance.job.save(job.toMap());

    final processor = _getOrCreateProcessor(chatUUID);
    processor.addJob(job);
    processor.triggerProcess();

    return job;
  }

  /// Pauses a specific job across any chat queue.
  bool pauseJob(String jobId, String chatUUID) {
    final processor = _processors[chatUUID];
    return processor?.pauseJob(jobId) ?? false;
  }

  /// Resumes a paused job with optional content modification.
  bool resumeAndModifyJob(String jobId, String chatUUID, [String? newContent]) {
    final processor = _processors[chatUUID];
    return processor?.resumeAndModifyJob(jobId, newContent) ?? false;
  }

  /// Cancels a job from the queue and SQLite.
  Future<void> cancelJob(String jobId, String chatUUID) async {
    final processor = _processors[chatUUID];
    processor?.removeJob(jobId);
    await AppDatabase.instance.job.delete(jobId);
  }

  /// Cancels an ongoing file transfer by UUID.
  Future<void> cancelFileTransfer(String fileUUID) async {
    for (final processor in _processors.values) {
      await processor.cancelFileTransfer(fileUUID);
    }
  }

  /// Gets the queue processor for a specific chat.
  ChatQueueProcessor? getProcessor(String chatUUID) {
    return _processors[chatUUID];
  }

  ChatQueueProcessor _getOrCreateProcessor(String chatUUID) {
    return _processors.putIfAbsent(chatUUID, () {
      final p = ChatQueueProcessor(chatUUID: chatUUID);
      p.isConnected = _isConnected;
      return p;
    });
  }

  void _triggerAllProcessors() {
    for (final processor in _processors.values) {
      processor.triggerProcess();
    }
  }

  Future<void> _checkInitialConnectivity() async {
    try {
      final results = await Connectivity().checkConnectivity();
      _isConnected = results.any((r) => r != ConnectivityResult.none);
    } catch (_) {
      _isConnected = true;
    }
  }

  void _handleNewInboundMessage(dynamic data) {
    if (data is Map) {
      final files = data['files'];
      final chatUUID = (data['chatUUID'] ?? data['chat_uuid']) as String?;
      if (files is List && files.isNotEmpty && chatUUID != null) {
        for (final file in files) {
          if (file is Map &&
              file['downloadURL'] != null &&
              file['uuid'] != null) {
            addInboundDownloadJob(
              id: 'dl_${file['uuid']}',
              chatUUID: chatUUID,
              fileUUID: file['uuid'] as String,
              downloadURL: file['downloadURL'] as String,
              name: file['name'] as String?,
            );
          }
        }
      }
    }
  }

  /// Disposes background listeners and processors.
  void dispose() {
    _connectivitySubscription?.cancel();
    GlobalEventEmitter.instance.off('message:new', _handleNewInboundMessage);
    for (final processor in _processors.values) {
      processor.dispose();
    }
    _processors.clear();
    _initialized = false;
  }
}

/// Riverpod provider for accessing [QueueManager], automatically kept in sync with [networkProvider].
final queueManagerProvider = Provider<QueueManager>((ref) {
  final manager = QueueManager.instance;

  // Keep QueueManager connectivity state in sync with networkProvider
  ref.listen<NetworkState>(networkProvider, (previous, next) {
    manager.setConnected(next.isConnected && next.isSynced);
  }, fireImmediately: true);

  return manager;
});
