import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/auth/validator.dart';

void main() {
  group('Validator Tests', () {
    group('Name validation', () {
      test('valid names pass', () {
        expect(Validator.validateName('John Doe'), isNull);
        expect(Validator.validateName('Mario Rossi'), isNull);
        expect(Validator.validateName('Alice'), isNull);
      });

      test('empty name fails', () {
        expect(Validator.validateName(''), isNotNull);
        expect(Validator.validateName(null), isNotNull);
        expect(Validator.validateName('   '), isNotNull);
      });

      test('name with numbers or special characters fails', () {
        expect(Validator.validateName('John123'), isNotNull);
        expect(Validator.validateName('Mario_Rossi'), isNotNull);
        expect(Validator.validateName('Alice!'), isNotNull);
      });

      test('name longer than 50 chars fails', () {
        final longName = 'a' * 51;
        expect(Validator.validateName(longName), isNotNull);
      });
    });

    group('Handle / Username validation', () {
      test('valid handles pass', () {
        expect(Validator.validateHandle('johndoe'), isNull);
        expect(Validator.validateHandle('user_123'), isNull);
        expect(Validator.validateHandle('alice'), isNull);
        expect(Validator.validateHandle('novyse_app'), isNull);
      });

      test('short handle (< 3 chars) fails', () {
        expect(Validator.validateHandle('ab'), isNotNull);
        expect(Validator.validateHandle(''), isNotNull);
        expect(Validator.validateHandle(null), isNotNull);
      });

      test('long handle (> 15 chars) fails', () {
        expect(Validator.validateHandle('abcdefghijklmnop'), isNotNull);
      });

      test(
        'handle with uppercase letters is normalized and valid if within spec',
        () {
          expect(Validator.validateHandle('JohnDoe'), isNull);
        },
      );

      test('handle with consecutive underscores fails', () {
        expect(Validator.validateHandle('john__doe'), isNotNull);
      });

      test('handle starting or ending with underscore fails', () {
        expect(Validator.validateHandle('_johndoe'), isNotNull);
        expect(Validator.validateHandle('johndoe_'), isNotNull);
      });

      test('handle with invalid characters fails', () {
        expect(Validator.validateHandle('john.doe'), isNotNull);
        expect(Validator.validateHandle('john@doe'), isNotNull);
        expect(Validator.validateHandle('john doe'), isNotNull);
      });
    });

    group('Password validation', () {
      test('valid password (>= 8 chars) passes', () {
        expect(Validator.validatePassword('12345678'), isNull);
        expect(Validator.validatePassword('secure_password_123'), isNull);
      });

      test('short password (< 8 chars) fails', () {
        expect(Validator.validatePassword('1234567'), isNotNull);
        expect(Validator.validatePassword(''), isNotNull);
        expect(Validator.validatePassword(null), isNotNull);
      });
    });

    group('Confirm Password validation', () {
      test('matching password passes', () {
        expect(
          Validator.validateConfirmPassword('secret123', 'secret123'),
          isNull,
        );
      });

      test('mismatching password fails', () {
        expect(
          Validator.validateConfirmPassword('secret123', 'secret456'),
          isNotNull,
        );
      });
    });
  });
}
