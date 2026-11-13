import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/comms/comms_models.dart';

void main() {
  test('screen share tile IDs use the share prefix', () {
    expect(screenShareTileId('TR_abc'), 'share:TR_abc');
  });
}
