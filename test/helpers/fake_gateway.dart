import 'package:novyse/core/services/api/modules/chat_module.dart';
import 'package:novyse/core/services/api/modules/check_module.dart';
import 'package:novyse/core/services/api/modules/comms_module.dart';
import 'package:novyse/core/services/api/modules/file_module.dart';
import 'package:novyse/core/services/api/modules/gather_module.dart';
import 'package:novyse/core/services/api/modules/message_module.dart';
import 'package:novyse/core/services/api/modules/notification_module.dart';
import 'package:novyse/core/services/api/modules/search_module.dart';
import 'package:novyse/core/services/api/modules/user_module.dart';
import 'package:novyse/core/services/api/modules/watch_together_module.dart';
import 'package:novyse/core/services/api_gateway.dart';

import 'fake_http.dart';

/// A [Gateway] whose modules all talk to a [FakeHttp] transport.
///
/// `Gateway` only exposes a private constructor that builds a real `Dio`, so
/// services that take a `Gateway` in their constructor cannot otherwise be
/// driven offline. Implementing the interface lets the real modules be reused
/// against the fake transport.
class FakeGateway implements Gateway {
  FakeGateway(this.http)
    : check = CheckModule(http.dio),
      user = UserModule(http.dio),
      search = SearchModule(http.dio),
      gather = GatherModule(http.dio),
      chat = ChatModule(http.dio),
      message = MessageModule(http.dio),
      file = FileModule(http.dio),
      comms = CommsModule(http.dio),
      watchTogether = WatchTogetherModule(http.dio),
      notification = NotificationModule(http.dio);

  /// A gateway that replies to every request with [data] in a success envelope.
  factory FakeGateway.always(Object? data) =>
      FakeGateway(FakeHttp.always(data));

  /// A gateway that replies to every request with a failure envelope.
  factory FakeGateway.failure([Object? data]) =>
      FakeGateway(FakeHttp.failure(data));

  /// A gateway whose transport always throws, simulating being offline.
  factory FakeGateway.offline() => FakeGateway(FakeHttp.offline());

  final FakeHttp http;

  @override
  final CheckModule check;

  @override
  final UserModule user;

  @override
  final SearchModule search;

  @override
  final GatherModule gather;

  @override
  final ChatModule chat;

  @override
  final MessageModule message;

  @override
  final FileModule file;

  @override
  final CommsModule comms;

  @override
  final WatchTogetherModule watchTogether;

  @override
  final NotificationModule notification;

  List<RecordedRequest> get requests => http.requests;
}
