import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/plugins/activity_stream.dart';
import 'package:novyse/core/plugins/bridge/bridge_protocol.dart';
import 'package:novyse/core/plugins/plugin_exception.dart';

void main() {
  ActivityStream stream() => ActivityStream(
    instanceId: 'act-1',
    room: () => null,
    onPacket: (sender, bytes) {},
  );

  test('topics are namespaced by instance', () {
    expect(ActivityStream.topicFor('act-1'), 'act.act-1');
    expect(ActivityStream.controlTopicFor('act-1'), 'act.act-1.ctl');
  });

  test('send refuses a stream packet over the ceiling', () async {
    await expectLater(
      stream().send(Uint8List(BridgeProtocol.maxStreamBytes + 1)),
      throwsA(
        isA<PluginCacheException>().having(
          (error) => error.code,
          'code',
          'E_TOO_LARGE',
        ),
      ),
    );
  });

  test('send without a room is a no-op for a small packet', () async {
    await stream().send(Uint8List(1));
  });

  test('publishAction refuses an action over the ceiling', () async {
    await expectLater(
      stream().publishAction(Uint8List(BridgeProtocol.maxActionBytes + 1)),
      throwsA(
        isA<PluginCacheException>().having(
          (error) => error.code,
          'code',
          'E_TOO_LARGE',
        ),
      ),
    );
  });

  test('publishAction requires a room', () async {
    await expectLater(
      stream().publishAction(Uint8List(1)),
      throwsA(
        isA<PluginCacheException>().having(
          (error) => error.code,
          'code',
          'E_NOT_IN_ROOM',
        ),
      ),
    );
  });
}
