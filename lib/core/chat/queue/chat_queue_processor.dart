import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:novyse/core/chat/queue/queue_job.dart';
import 'package:novyse/core/events/global_event_emitter.dart';
import 'package:novyse/core/services/api_gateway.dart';
import 'package:novyse/core/storage/database/database.dart';
import 'package:novyse/core/storage/file/file.dart';

/// Processor for handling queued message and file jobs sequentially for a single chat.
class ChatQueueProcessor {
  final String chatUUID;
  final List<QueueJob> _jobs = [];
  bool _isProcessing = false;
  QueueJob? _currentJob;

  /// Global network connection state provider reference.
  bool isConnected = true;
  bool _disposed = false;

  ChatQueueProcessor({required this.chatUUID});

  bool get isDisposed => _disposed;
  List<QueueJob> get jobs => List.unmodifiable(_jobs);
  QueueJob? get currentJob => _currentJob;
  bool get isProcessing => _isProcessing;

  /// Disposes this processor and cancels any active jobs.
  void dispose() {
    _disposed = true;
    _currentJob?.cancelToken?.cancel('Processor disposed');
    _currentJob = null;
    _jobs.clear();
  }

  /// Adds a job to the chat's queue, sorting by priority and creation time.
  void addJob(QueueJob job) {
    if (_disposed) return;
    _jobs.removeWhere((j) => j.id == job.id);
    _jobs.add(job);
    _sortJobs();
    _checkPreemption(job);
  }

  /// Removes a job from the queue.
  void removeJob(String jobId) {
    if (_currentJob?.id == jobId) {
      _currentJob?.cancelToken?.cancel('Job removed');
      _currentJob = null;
    }
    _jobs.removeWhere((j) => j.id == jobId);
  }

  /// Pauses a specific job.
  bool pauseJob(String jobId) {
    final job = _findJob(jobId);
    if (job != null) {
      job.status = JobStatus.paused;
      if (_currentJob?.id == jobId) {
        _currentJob?.cancelToken?.cancel('Job paused');
        _currentJob = null;
      }
      AppDatabase.instance.job.updateStatus(jobId, JobStatus.paused.value);
      return true;
    }
    return false;
  }

  /// Resumes a paused job and optionally modifies its text content.
  bool resumeAndModifyJob(String jobId, [String? newContent]) {
    final job = _findJob(jobId);
    if (job != null) {
      if (newContent != null) {
        job.payload['content'] = newContent;
        if (job.payload['message'] is Map) {
          (job.payload['message'] as Map)['content'] = newContent;
        }
        AppDatabase.instance.job.updatePayload(jobId, job.payload);
      }
      job.status = JobStatus.pending;
      AppDatabase.instance.job.updateStatus(jobId, JobStatus.pending.value);
      triggerProcess();
      return true;
    }
    return false;
  }

  /// Cancels an ongoing file transfer and updates or cancels the job.
  Future<void> cancelFileTransfer(String fileUUID) async {
    S3Adapter.cancel(fileUUID);

    for (final job in _jobs) {
      final message = job.payload['message'] is Map
          ? Map<String, dynamic>.from(job.payload['message'] as Map)
          : null;
      final files = (job.payload['files'] ?? message?['files']) as List?;

      if (files != null && files.isNotEmpty) {
        final remainingFiles = files.where((f) {
          if (f is Map) return f['uuid'] != fileUUID;
          return true;
        }).toList();

        final content =
            (job.payload['content'] ?? message?['content'] ?? '') as String;
        if (remainingFiles.isEmpty && content.trim().isEmpty) {
          removeJob(job.id);
          await AppDatabase.instance.job.delete(job.id);
          GlobalEventEmitter.instance.emit('message:failed', {
            'tempId': job.id,
            'error': 'File transfer cancelled',
          });
          return;
        }

        job.payload['files'] = remainingFiles;
        if (message != null) {
          message['files'] = remainingFiles;
          job.payload['message'] = message;
        }
        await AppDatabase.instance.job.updatePayload(job.id, job.payload);

        GlobalEventEmitter.instance.emit('message:update', {
          'chatUUID': chatUUID,
          'messageID': job.id,
          'action': 'edit',
          'data': {'files': remainingFiles},
        });
      }
    }
  }

  /// Triggers processing loop if not already running.
  void triggerProcess() {
    if (!_disposed && !_isProcessing) {
      _processNext();
    }
  }

  QueueJob? _findJob(String jobId) {
    try {
      return _jobs.firstWhere((j) => j.id == jobId);
    } catch (_) {
      return null;
    }
  }

  void _sortJobs() {
    _jobs.sort((a, b) {
      final priorityComparison = b.priority.compareTo(a.priority);
      if (priorityComparison != 0) return priorityComparison;
      return a.createdAt.compareTo(b.createdAt);
    });
  }

  /// If a high-priority text message arrives while a lower-priority file job is uploading,
  /// preemptively pause the file upload to let the text message pass through immediately.
  void _checkPreemption(QueueJob newJob) {
    if (_currentJob != null &&
        _currentJob!.type == JobType.fileUpload &&
        newJob.priority > _currentJob!.priority &&
        newJob.status == JobStatus.pending) {
      debugPrint(
        '[ChatQueue] Preempting file upload ${_currentJob!.id} for high-priority job ${newJob.id}',
      );
      _currentJob?.cancelToken?.cancel('Preempted by higher priority job');
      _currentJob?.status = JobStatus.pending;
      _currentJob = null;
      _isProcessing = false;
      _sortJobs();
      triggerProcess();
    }
  }

  Future<void> _processNext() async {
    if (_disposed || _isProcessing) return;

    final pendingJobs = _jobs
        .where((j) => j.status == JobStatus.pending)
        .toList();
    if (pendingJobs.isEmpty) {
      _isProcessing = false;
      _currentJob = null;
      return;
    }

    _isProcessing = true;
    final job = pendingJobs.first;
    _currentJob = job;

    try {
      if (_disposed) return;
      await _executeJob(job);
    } catch (e, stack) {
      if (_disposed || !AppDatabase.instance.isOpen) {
        return;
      }
      if (e is DioException && CancelToken.isCancel(e)) {
        return;
      }
      debugPrint('[ChatQueue] Error processing job ${job.id}: $e\n$stack');
      job.attempts += 1;
      job.errorMessage = e.toString();

      if (job.attempts >= job.maxRetries) {
        job.status = JobStatus.failed;
        if (AppDatabase.instance.isOpen) {
          await AppDatabase.instance.job.updateStatus(
            job.id,
            JobStatus.failed.value,
            errorMessage: job.errorMessage,
            attempts: job.attempts,
          );
        }
        await GlobalEventEmitter.instance.message.failed(
          job.id,
          job.errorMessage,
        );
      } else {
        job.status = JobStatus.pending;
        if (AppDatabase.instance.isOpen) {
          await AppDatabase.instance.job.updateStatus(
            job.id,
            JobStatus.pending.value,
            errorMessage: job.errorMessage,
            attempts: job.attempts,
          );
        }
      }
    } finally {
      _isProcessing = false;
      _currentJob = null;
      // Only continue to next job if online and more pending jobs exist
      if (!_disposed &&
          isConnected &&
          _jobs.any((j) => j.status == JobStatus.pending)) {
        Future.microtask(_processNext);
      }
    }
  }

  Future<void> _executeJob(QueueJob job) async {
    if (_disposed || !AppDatabase.instance.isOpen) return;
    job.status = JobStatus.processing;
    job.cancelToken = CancelToken();
    if (AppDatabase.instance.isOpen) {
      await AppDatabase.instance.job.updateStatus(
        job.id,
        JobStatus.processing.value,
      );
    }

    if (_disposed) return;

    switch (job.type) {
      case JobType.outgoingMessage:
        await _executeOutgoingMessage(job);
        break;
      case JobType.fileUpload:
        await _executeFileUpload(job);
        break;
      case JobType.fileDownload:
      case JobType.inboundMessage:
        await _executeInboundDownload(job);
        break;
    }
  }

  /// Outgoing message execution (Local optimistic phase -> S3 File Upload -> API Gateway Dispatch).
  Future<void> _executeOutgoingMessage(QueueJob job) async {
    final message = job.payload['message'] is Map
        ? Map<String, dynamic>.from(job.payload['message'] as Map)
        : Map<String, dynamic>.from(job.payload);

    final rawFiles = (message['files'] ?? job.payload['files']) as List?;
    final files = rawFiles != null
        ? rawFiles
              .map(
                (f) => f is Map
                    ? Map<String, dynamic>.from(f)
                    : <String, dynamic>{},
              )
              .toList()
        : <Map<String, dynamic>>[];

    // === PHASE 1: LOCAL (Runs even when OFFLINE) ===
    // 1. Process local media metadata (waveforms, durations) and store local copies
    for (final file in files) {
      final uri = file['uri'] as String?;
      final bytes = file['bytes'] as Uint8List?;

      if (file['duration'] == null && (uri != null || bytes != null)) {
        try {
          final fileBytes =
              bytes ??
              (uri != null ? await FileStorage.instance.getBytes(uri) : null);
          if (fileBytes != null) {
            final mime = (file['mimeType'] ?? '') as String;
            if (mime.contains('wav')) {
              file['duration'] = extractAudioDurationFromWav(fileBytes);
            } else if (mime.contains('mp4')) {
              file['duration'] = extractVideoDurationFromMp4(fileBytes);
            }
            if (file['waveform'] == null &&
                (mime.contains('audio') || mime.contains('wav'))) {
              file['waveform'] = processWaveform(fileBytes);
            }
          }
        } catch (_) {}
      }
    }

    // 2. Persist local message in DB in pending/sending status and emit global event
    if (_disposed || !AppDatabase.instance.isOpen) return;
    message['chatUUID'] = chatUUID;
    message['subID'] = job.subID;
    message['status'] = 'PENDING_SEND';
    await GlobalEventEmitter.instance.message.add(message);

    // === PHASE 2: NETWORK (Requires Internet) ===
    if (_disposed) return;
    if (!isConnected) {
      debugPrint(
        '[ChatQueue] Device offline. Job ${job.id} paused until network resumes.',
      );
      job.status = JobStatus.pending;
      if (AppDatabase.instance.isOpen) {
        await AppDatabase.instance.job.updateStatus(
          job.id,
          JobStatus.pending.value,
        );
      }
      return;
    }

    // 3. Dispatch to API Gateway
    final subID = job.subID;
    final content = message['content'] as String?;
    final type = (message['type'] ?? 'message') as String;
    final replyTos = message['replyTos'] as List<dynamic>?;

    try {
      final sendResult = await apiGateway.message.send(
        chatUUID,
        subID: subID,
        content: content,
        type: type,
        files: files.isNotEmpty ? files : null,
        replyTos: replyTos,
      );

      if (_disposed) return;

      if (!sendResult.success || sendResult.message == null) {
        throw Exception('Failed to send message: API request unsuccessful');
      }

      final serverMessage = Map<String, dynamic>.from(sendResult.message!);
      serverMessage['chatUUID'] ??= chatUUID;
      serverMessage['subID'] ??= subID;
      final serverStatus = serverMessage['status'] as String? ?? 'sent';

      if (serverStatus == 'pending') {
        // Upload S3 files using presigned URLs returned by server
        final serverFiles = serverMessage['files'] as List?;
        if (serverFiles != null && serverFiles.isNotEmpty) {
          for (var i = 0; i < serverFiles.length; i++) {
            if (_disposed) return;
            final sFile = serverFiles[i];
            if (sFile is Map) {
              final uploadURL = sFile['uploadURL'] as String?;
              final fileUUID = sFile['uuid'] as String?;
              final localFile = files.firstWhere(
                (f) => f['uuid'] == fileUUID || f['name'] == sFile['name'],
                orElse: () => Map<String, dynamic>.from(sFile),
              );
              final uri = localFile['uri'] as String?;
              final bytes = localFile['bytes'] as Uint8List?;

              if (uploadURL != null &&
                  fileUUID != null &&
                  (uri != null || bytes != null)) {
                final fileBytes =
                    bytes ?? await FileStorage.instance.getBytes(uri!);
                await S3Adapter.instance.upload(
                  fileUUID: fileUUID,
                  uploadURL: uploadURL,
                  bytes: fileBytes,
                  mimeType: localFile['mimeType'] as String? ?? defaultMimeType,
                  cancelToken: job.cancelToken,
                  onProgress: (sent, total) {
                    final overallFileProgress = total > 0 ? sent / total : 0.0;
                    final overallJobProgress =
                        (i + overallFileProgress) / serverFiles.length;
                    job.progress = overallJobProgress;
                    GlobalEventEmitter.instance.emit('message:progress', {
                      'uuid': fileUUID,
                      'loaded': sent,
                      'total': total,
                      'jobProgress': overallJobProgress,
                    });
                  },
                );
              }
            }
          }
        }

        if (_disposed) return;

        // Confirm message after upload
        final messageUUID =
            (serverMessage['messageUUID'] ?? serverMessage['uuid']) as String?;
        if (messageUUID != null) {
          final confirmResult = await apiGateway.message.confirm(messageUUID);
          if (!confirmResult.success) {
            throw Exception('Message confirmation failed on server');
          }
        }
      }

      if (_disposed) return;

      final serverCreatedAt = serverMessage['created_at'] ??
          serverMessage['createdAt'];
      if (serverCreatedAt != null) {
        serverMessage['createdAt'] = serverCreatedAt.toString();
        serverMessage['created_at'] = serverCreatedAt.toString();
      }

      serverMessage['status'] = 'sent';
      serverMessage['tempId'] = job.id;

      // Finalize message in DB and emit success
      job.status = JobStatus.completed;
      if (AppDatabase.instance.isOpen) {
        await AppDatabase.instance.job.updateStatus(
          job.id,
          JobStatus.completed.value,
          progress: 1.0,
        );
      }
      await GlobalEventEmitter.instance.message.add(serverMessage);
    } catch (e) {
      rethrow;
    }
  }

  /// Standalone file upload execution.
  Future<void> _executeFileUpload(QueueJob job) async {
    if (!isConnected || _disposed) {
      job.status = JobStatus.pending;
      return;
    }

    final fileUUID = job.payload['fileUUID'] as String;
    final uploadURL = job.payload['uploadURL'] as String;
    final bytes = job.payload['bytes'] as Uint8List?;
    final uri = job.payload['uri'] as String?;

    final fileBytes =
        bytes ??
        (uri != null ? await FileStorage.instance.getBytes(uri) : null);
    if (fileBytes == null) throw Exception('File bytes not available');

    await S3Adapter.instance.upload(
      fileUUID: fileUUID,
      uploadURL: uploadURL,
      bytes: fileBytes,
      mimeType: job.payload['mimeType'] as String? ?? defaultMimeType,
      cancelToken: job.cancelToken,
      onProgress: (sent, total) {
        job.progress = total > 0 ? sent / total : 0.0;
        GlobalEventEmitter.instance.emit('file:progress', {
          'uuid': fileUUID,
          'loaded': sent,
          'total': total,
        });
      },
    );

    if (_disposed) return;

    job.status = JobStatus.completed;
    if (AppDatabase.instance.isOpen) {
      await AppDatabase.instance.job.updateStatus(
        job.id,
        JobStatus.completed.value,
        progress: 1.0,
      );
    }
    _jobs.removeWhere((j) => j.id == job.id);
  }

  /// Inbound file download execution.
  Future<void> _executeInboundDownload(QueueJob job) async {
    if (!isConnected || _disposed) {
      job.status = JobStatus.pending;
      return;
    }

    final fileUUID = job.payload['fileUUID'] as String;
    final downloadURL = job.payload['downloadURL'] as String;

    final bytes = await S3Adapter.instance.download(
      fileUUID: fileUUID,
      downloadURL: downloadURL,
      cancelToken: job.cancelToken,
      onProgress: (received, total) {
        job.progress = total > 0 ? received / total : 0.0;
        GlobalEventEmitter.instance.emit('file:download_progress', {
          'uuid': fileUUID,
          'loaded': received,
          'total': total,
        });
      },
    );

    if (_disposed) return;

    // Save downloaded bytes to local file storage
    final ext = (job.payload['name'] as String? ?? '').split('.').last;
    final saveResult = await FileStorage.instance.save.byBytes(
      bytes,
      '$fileUUID.${ext.isNotEmpty ? ext : "dat"}',
    );
    final uri =
        await FileStorage.instance.read(saveResult.ref) ?? saveResult.ref;

    if (AppDatabase.instance.isOpen) {
      await AppDatabase.instance.file.update.uri(fileUUID, uri);
    }

    if (_disposed) return;

    job.status = JobStatus.completed;
    if (AppDatabase.instance.isOpen) {
      await AppDatabase.instance.job.updateStatus(
        job.id,
        JobStatus.completed.value,
        progress: 1.0,
      );
    }
    _jobs.removeWhere((j) => j.id == job.id);

    GlobalEventEmitter.instance.emit('file:downloaded', {
      'fileUUID': fileUUID,
      'uri': uri,
    });
  }
}
