import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/dio_factory.dart';
import 'api/modules/chat_module.dart';
import 'api/modules/check_module.dart';
import 'api/modules/comms_module.dart';
import 'api/modules/file_module.dart';
import 'api/modules/gather_module.dart';
import 'api/modules/message_module.dart';
import 'api/modules/notification_module.dart';
import 'api/modules/search_module.dart';
import 'api/modules/user_module.dart';
import 'api/modules/watch_together_module.dart';

export 'api/dio_factory.dart' show createDefaultDio;

/// Global singleton instance of [Gateway].
final apiGateway = Gateway.instance;

/// Riverpod provider for accessing the [Gateway].
final apiGatewayProvider = Provider<Gateway>((ref) => Gateway.instance);

class Gateway {
  Gateway._() : this._withDio(createDefaultDio());
  static final Gateway instance = Gateway._();
  factory Gateway() => instance;

  Gateway._withDio(Dio dio)
    : check = CheckModule(dio),
      user = UserModule(dio),
      search = SearchModule(dio),
      gather = GatherModule(dio),
      chat = ChatModule(dio),
      message = MessageModule(dio),
      file = FileModule(dio),
      comms = CommsModule(dio),
      watchTogether = WatchTogetherModule(dio),
      notification = NotificationModule(dio);

  final CheckModule check;
  final UserModule user;
  final SearchModule search;
  final GatherModule gather;
  final ChatModule chat;
  final MessageModule message;
  final FileModule file;
  final CommsModule comms;
  final WatchTogetherModule watchTogether;
  final NotificationModule notification;
}
