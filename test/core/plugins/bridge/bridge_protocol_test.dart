import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/plugins/bridge/bridge_protocol.dart';
import 'package:novyse/core/plugins/bridge/plugin_bridge.dart';

void main() {
  group('BridgeProtocol', () {
    test('decodes a request from a map and from JSON text', () {
      final request = BridgeProtocol.decodeRequest({
        'id': 7,
        'method': 'state.send',
        'params': {'type': 'value'},
      });

      expect(request?.id, 7);
      expect(request?.method, 'state.send');
      expect(request?.string('type'), 'value');
      expect(request?.string('missing'), isNull);

      final decoded = BridgeProtocol.decodeRequest('{"id":1,"method":"init"}');

      expect(decoded?.id, 1);
      expect(decoded?.method, 'init');
    });

    test('rejects malformed requests', () {
      expect(
        BridgeProtocol.decodeRequest({'id': '1', 'method': 'init'}),
        isNull,
      );
      expect(BridgeProtocol.decodeRequest({'id': 1, 'method': ''}), isNull);
      expect(BridgeProtocol.decodeRequest('not json'), isNull);
      expect(BridgeProtocol.decodeRequest(null), isNull);
    });

    test('encodes success and failure replies', () {
      expect(
        const BridgeReply.success(4, {'ok': true}).encode(),
        contains('"ok":true'),
      );
      expect(
        const BridgeReply.failure(5, 'E_TEST', 'bad').encode(),
        contains('E_TEST'),
      );
    });
  });

  group('plugin scripts', () {
    test('emitScript escapes the payload as a string literal', () {
      final script = emitScript('activity:action', {'text': "it's\n"});

      expect(script, startsWith('window.__appSdkEmit&&'));
      expect(script, contains("it\\'s"));
      expect(script, isNot(contains('\n')));
    });

    test('replyScript calls the reply function', () {
      final script = replyScript(const BridgeReply.failure(2, 'E_TEST', 'bad'));

      expect(script, startsWith('window.__appSdkReply('));
      expect(script, contains('E_TEST'));
    });
  });
}
