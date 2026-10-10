import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

/// Builds the standard API envelope every module in `core/services/api`
/// unwraps via `isOk` / `responseData`.
Map<String, dynamic> envelope({bool success = true, Object? data}) =>
    <String, dynamic>{'success': success, 'data': data};

/// A single request captured by [RecordingAdapter].
class RecordedRequest {
  RecordedRequest(this.options, this.body);

  final RequestOptions options;

  /// Decoded JSON request body, or `null` for bodyless requests.
  final Object? body;

  /// [body] as a JSON object, for the common `assert body['key']` shape.
  Map<String, dynamic> get json => (body! as Map).cast<String, dynamic>();

  String get method => options.method;

  String get path => options.path;

  Map<String, dynamic> get query =>
      options.queryParameters.map((k, v) => MapEntry(k, v));

  @override
  String toString() => '$method $path${body == null ? '' : ' $body'}';
}

/// An [HttpClientAdapter] that never touches the network: it records the
/// outgoing request and replies with whatever [responder] returns.
class RecordingAdapter implements HttpClientAdapter {
  RecordingAdapter(this.responder);

  /// Returns the body to reply with. May throw to simulate a transport error.
  final Object? Function(RequestOptions options) responder;

  /// Every request seen so far, in order.
  final List<RecordedRequest> requests = <RecordedRequest>[];

  RecordedRequest get last => requests.last;

  int get callCount => requests.length;

  /// Whether any request hit [path].
  bool calledPath(String path) => requests.any((r) => r.path == path);

  RecordedRequest requestFor(String path) =>
      requests.firstWhere((r) => r.path == path);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final body = options.data == null
        ? null
        : jsonDecode(jsonEncode(options.data)) as Object?;
    requests.add(RecordedRequest(options, body));

    final result = responder(options);
    final text = result is String ? result : jsonEncode(result);
    return ResponseBody.fromString(
      text,
      200,
      headers: {
        Headers.contentTypeHeader: <String>[Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

/// A hermetic [Dio] wired to a [RecordingAdapter].
///
/// Deliberately built with a plain constructor rather than
/// `createDefaultDio()` so the auth/session interceptors — which reach for the
/// native `novyse_auth` SDK — never run during tests.
class FakeHttp {
  FakeHttp._(this.dio, this.adapter);

  /// Builds a fake client whose replies are produced by [responder].
  factory FakeHttp.replying(
    Object? Function(RequestOptions options) responder, {
    String baseUrl = 'https://api.test',
  }) {
    final dio = Dio(BaseOptions(baseUrl: baseUrl));
    final adapter = RecordingAdapter(responder);
    dio.httpClientAdapter = adapter;
    return FakeHttp._(dio, adapter);
  }

  /// Replies to every request with a successful envelope wrapping [data].
  factory FakeHttp.always(Object? data) =>
      FakeHttp.replying((_) => envelope(data: data));

  /// Replies to every request with an unsuccessful envelope.
  factory FakeHttp.failure([Object? data]) =>
      FakeHttp.replying((_) => envelope(success: false, data: data));

  /// Throws a [DioException] on every request, simulating a transport error.
  factory FakeHttp.offline() => FakeHttp.replying((options) {
    throw DioException.connectionError(
      requestOptions: options,
      reason: 'offline',
    );
  });

  final Dio dio;

  final RecordingAdapter adapter;

  List<RecordedRequest> get requests => adapter.requests;

  RecordedRequest get last => adapter.last;

  /// The single request made against the fake client.
  RecordedRequest get only {
    if (adapter.callCount != 1) {
      throw StateError(
        'Expected exactly 1 request, got ${adapter.callCount}: '
        '${adapter.requests.join(', ')}',
      );
    }
    return adapter.last;
  }
}
