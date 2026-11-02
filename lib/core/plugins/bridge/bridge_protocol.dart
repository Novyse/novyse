import 'dart:convert';

import 'package:flutter/foundation.dart';

/// The wire protocol between the sandbox and the host (§10.3).
///
/// One shape for every platform: a JSON `{id, method, params}` request and a
/// JSON `{id, ok, result|error}` reply. Only the transport changes.
abstract final class BridgeProtocol {
  /// Name of the native handler and of the JavaScript channel.
  static const String handlerName = 'appSdk';

  /// Tag of the `postMessage`s the iframe sends to the host.
  static const String webSource = 'app-sdk';

  /// Tag of the replies the host sends back to the iframe.
  static const String webReplySource = 'app-sdk-host';

  /// Function the host calls to deliver an event to the plugin.
  static const String emitFunction = '__appSdkEmit';

  /// Function the host calls to answer a request when there is no promise.
  static const String replyFunction = '__appSdkReply';

  /// Ceiling of a `STATE` payload (§10.5).
  static const int maxStateBytes = 16 * 1024;

  /// Ceiling of an `ACTION` payload (§10.5).
  static const int maxActionBytes = 4 * 1024;

  /// Ceiling of a `STREAM` packet (§10.5).
  static const int maxStreamBytes = 8 * 1024;

  /// Decodes one request, returning `null` when it is not a request.
  static BridgeRequest? decodeRequest(Object? raw) {
    final map = decodeMap(raw);
    if (map == null) return null;

    final id = map['id'];
    final method = map['method'];

    if (id is! num || method is! String || method.isEmpty) return null;

    final params = map['params'];

    return BridgeRequest(
      id: id.toInt(),
      method: method,
      params: params is Map ? Map<String, dynamic>.from(params) : null,
    );
  }

  /// Decodes a JSON object, tolerating both a string and an already decoded
  /// map: the platforms hand one or the other depending on the transport.
  static Map<String, dynamic>? decodeMap(Object? raw) {
    if (raw is Map) return Map<String, dynamic>.from(raw);
    if (raw is! String || raw.isEmpty) return null;

    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) return Map<String, dynamic>.from(decoded);
    } on FormatException {
      return null;
    }

    return null;
  }

  /// The envelope of an event pushed to the plugin.
  static String encodeEvent(String event, Object? payload) =>
      jsonEncode({'event': event, 'payload': payload});
}

/// One call of the plugin into the host.
@immutable
class BridgeRequest {
  const BridgeRequest({required this.id, required this.method, this.params});

  final int id;
  final String method;
  final Map<String, dynamic>? params;

  /// Reads a string parameter, `null` when missing or not a string.
  String? string(String key) {
    final value = params?[key];
    return value is String ? value : null;
  }

  /// Reads a decoded parameter, `null` when missing.
  Object? value(String key) => params?[key];

  /// The size of any parameter once serialised, used for the payload caps.
  int get sizeBytes => jsonEncode(params?['data'] ?? params).length;
}

/// The answer to a [BridgeRequest].
@immutable
class BridgeReply {
  const BridgeReply._(this.id, this.ok, this.result, this.code, this.message);

  const BridgeReply.success(int id, [Object? result])
    : this._(id, true, result, null, null);

  const BridgeReply.failure(int id, String code, [String? message])
    : this._(id, false, null, code, message);

  final int id;
  final bool ok;
  final Object? result;
  final String? code;
  final String? message;

  String encode() => jsonEncode({
    'id': id,
    'ok': ok,
    if (ok) 'result': result,
    if (!ok)
      'error': {
        'code': code ?? 'E_INTERNAL',
        if (message != null) 'message': message,
      },
  });
}
