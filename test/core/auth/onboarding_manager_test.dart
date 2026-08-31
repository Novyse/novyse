import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/auth/onboarding_manager.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('OnboardingManager Tests', () {
    setUp(() {
      FlutterSecureStorage.setMockInitialValues({});
    });

    test('setLogin stores userUUID and sessionId', () async {
      final manager = OnboardingManager();
      await manager.setLogin(
        userUUID: 'user-123',
        sessionID: 'session-456',
        sessionId: 'session-456',
      );

      final userUUID = await manager.getUserUUID();
      expect(userUUID, 'user-123');

      final loggedIn = await manager.isLoggedIn();
      expect(loggedIn, isTrue);
    });

    test('logout clears stored credentials', () async {
      final manager = OnboardingManager();
      await manager.setLogin(userUUID: 'user-123', sessionID: 'session-456');

      await manager.logout();

      final userUUID = await manager.getUserUUID();
      expect(userUUID, isNull);
    });
  });
}
