import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/storage/database/repositories/message/helpers/message_field_parser.dart';

void main() {
  group('MessageFieldParser createdAt parsing tests', () {
    test('parses ISO string without timezone as UTC and converts to local', () {
      final parsed = MessageFieldParser.parseCreatedAtDateTime('2026-10-13T19:16:00');
      final expectedUtc = DateTime.utc(2026, 10, 13, 19, 16, 0);
      expect(parsed.isUtc, isFalse);
      expect(parsed, equals(expectedUtc.toLocal()));
    });

    test('parses space-separated string (SQLite CURRENT_TIMESTAMP) as UTC and converts to local', () {
      final parsed = MessageFieldParser.parseCreatedAtDateTime('2026-10-13 19:16:00');
      final expectedUtc = DateTime.utc(2026, 10, 13, 19, 16, 0);
      expect(parsed.isUtc, isFalse);
      expect(parsed, equals(expectedUtc.toLocal()));
    });

    test('parses ISO string with Z as UTC and converts to local', () {
      final parsed = MessageFieldParser.parseCreatedAtDateTime('2026-10-13T19:16:00.000Z');
      final expectedUtc = DateTime.utc(2026, 10, 13, 19, 16, 0);
      expect(parsed.isUtc, isFalse);
      expect(parsed, equals(expectedUtc.toLocal()));
    });

    test('parses epoch integer as UTC milliseconds and converts to local', () {
      final dtUtc = DateTime.utc(2026, 10, 13, 19, 16, 0);
      final ms = dtUtc.millisecondsSinceEpoch;
      final parsed = MessageFieldParser.parseCreatedAtDateTime(ms);
      expect(parsed, equals(dtUtc.toLocal()));
    });

    test('parses epoch string as UTC milliseconds and converts to local', () {
      final dtUtc = DateTime.utc(2026, 10, 13, 19, 16, 0);
      final msStr = dtUtc.millisecondsSinceEpoch.toString();
      final parsed = MessageFieldParser.parseCreatedAtDateTime(msStr);
      expect(parsed, equals(dtUtc.toLocal()));
    });

    test('parseCreatedAtString returns UTC ISO string for SQLite/server', () {
      final iso = MessageFieldParser.parseCreatedAtString({
        'created_at': '2026-10-13 19:16:00',
      });
      expect(iso.contains('T'), isTrue);
      expect(iso.endsWith('Z'), isTrue);
      expect(DateTime.parse(iso).toUtc(), equals(DateTime.utc(2026, 10, 13, 19, 16, 0)));
    });
  });
}
