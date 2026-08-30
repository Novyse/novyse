import 'dart:convert';

import 'package:dio/dio.dart';

/// Status states for queue jobs.
enum JobStatus {
  pending('PENDING'),
  processing('PROCESSING'),
  paused('PAUSED'),
  completed('COMPLETED'),
  failed('FAILED');

  final String value;
  const JobStatus(this.value);

  static JobStatus fromString(String? val) {
    if (val == null) return JobStatus.pending;
    return JobStatus.values.firstWhere(
      (e) => e.value.toUpperCase() == val.toUpperCase(),
      orElse: () => JobStatus.pending,
    );
  }
}

/// Types of jobs supported by the queue.
enum JobType {
  outgoingMessage('OUTGOING_MESSAGE'),
  inboundMessage('INBOUND_MESSAGE'),
  fileUpload('FILE_UPLOAD'),
  fileDownload('FILE_DOWNLOAD');

  final String value;
  const JobType(this.value);

  static JobType fromString(String? val) {
    if (val == null) return JobType.outgoingMessage;
    return JobType.values.firstWhere(
      (e) => e.value.toUpperCase() == val.toUpperCase(),
      orElse: () => JobType.outgoingMessage,
    );
  }
}

/// Predefined standard priority values for jobs.
class JobPriority {
  static const int urgent = 100;
  static const int textMessage = 50;
  static const int fileUpload = 10;
  static const int background = 1;
}

/// Represents a unit of work (message sending, file upload/download) managed by the queue.
class QueueJob {
  final String id;
  final String chatUUID;
  final int subID;
  final JobType type;
  int priority;
  JobStatus status;
  Map<String, dynamic> payload;
  double progress;
  int attempts;
  int maxRetries;
  String? errorMessage;
  final DateTime createdAt;
  DateTime updatedAt;

  /// In-memory cancellation token for active HTTP/S3 network operations.
  CancelToken? cancelToken;

  QueueJob({
    required this.id,
    required this.chatUUID,
    this.subID = 0,
    required this.type,
    this.priority = JobPriority.fileUpload,
    this.status = JobStatus.pending,
    required this.payload,
    this.progress = 0.0,
    this.attempts = 0,
    this.maxRetries = 5,
    this.errorMessage,
    DateTime? createdAt,
    DateTime? updatedAt,
    this.cancelToken,
  }) : createdAt = createdAt ?? DateTime.now(),
       updatedAt = updatedAt ?? DateTime.now();

  bool get isCompleted => status == JobStatus.completed;
  bool get isFailed => status == JobStatus.failed;
  bool get isPaused => status == JobStatus.paused;
  bool get isProcessing => status == JobStatus.processing;
  bool get isPending => status == JobStatus.pending;

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'chat_uuid': chatUUID,
      'sub_id': subID,
      'job_type': type.value,
      'priority': priority,
      'status': status.value,
      'payload': jsonEncode(payload),
      'progress': progress,
      'attempts': attempts,
      'max_retries': maxRetries,
      'error_message': errorMessage,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  factory QueueJob.fromMap(Map<String, dynamic> map) {
    Map<String, dynamic> parsedPayload = {};
    final rawPayload = map['payload'];
    if (rawPayload is String) {
      try {
        parsedPayload = jsonDecode(rawPayload) as Map<String, dynamic>;
      } catch (_) {}
    } else if (rawPayload is Map) {
      parsedPayload = Map<String, dynamic>.from(rawPayload);
    }

    return QueueJob(
      id: (map['id'] ?? '') as String,
      chatUUID: (map['chat_uuid'] ?? map['chatUUID'] ?? '') as String,
      subID: (map['sub_id'] ?? map['subID'] ?? 0) as int,
      type: JobType.fromString(map['job_type'] as String?),
      priority: (map['priority'] as num?)?.toInt() ?? JobPriority.fileUpload,
      status: JobStatus.fromString(map['status'] as String?),
      payload: parsedPayload,
      progress: (map['progress'] as num?)?.toDouble() ?? 0.0,
      attempts: (map['attempts'] as num?)?.toInt() ?? 0,
      maxRetries: (map['max_retries'] as num?)?.toInt() ?? 5,
      errorMessage: map['error_message'] as String?,
      createdAt: map['created_at'] != null
          ? DateTime.tryParse(map['created_at'] as String)
          : null,
      updatedAt: map['updated_at'] != null
          ? DateTime.tryParse(map['updated_at'] as String)
          : null,
    );
  }

  QueueJob copyWith({
    String? id,
    String? chatUUID,
    int? subID,
    JobType? type,
    int? priority,
    JobStatus? status,
    Map<String, dynamic>? payload,
    double? progress,
    int? attempts,
    int? maxRetries,
    String? errorMessage,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return QueueJob(
      id: id ?? this.id,
      chatUUID: chatUUID ?? this.chatUUID,
      subID: subID ?? this.subID,
      type: type ?? this.type,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      payload: payload ?? this.payload,
      progress: progress ?? this.progress,
      attempts: attempts ?? this.attempts,
      maxRetries: maxRetries ?? this.maxRetries,
      errorMessage: errorMessage ?? this.errorMessage,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      cancelToken: cancelToken,
    );
  }
}
