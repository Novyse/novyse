import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/stores/status_store.dart';
import 'package:novyse/ui/components/status/status_message.dart';

void main() {
  late ProviderContainer container;

  setUp(() {
    container = ProviderContainer();
  });

  tearDown(() {
    container.dispose();
  });

  group('StatusStore & StatusNotifier Tests', () {
    test('initial state has no active statuses and primaryStatus is null', () {
      final state = container.read(statusProvider);
      expect(state.activeStatuses, isEmpty);
      expect(state.primaryStatus, isNull);
      expect(container.read(activeStatusProvider), isNull);
    });

    test('priority ordering selects network offline over initSync and socket', () {
      final notifier = container.read(statusProvider.notifier);

      // Show socket status (priority 60)
      notifier.setSocketStatus(isConnected: false, isConnecting: false);
      expect(container.read(activeStatusProvider)?.source, equals(StatusSource.socket));

      // Show sync status (priority 80)
      notifier.setSyncProgress(
        title: 'Syncing',
        message: 'Loading...',
        progress: 0.5,
      );
      expect(container.read(activeStatusProvider)?.source, equals(StatusSource.initSync));

      // Show offline status (priority 100)
      notifier.setOffline(true);
      expect(container.read(activeStatusProvider)?.source, equals(StatusSource.network));

      // Clear offline status -> falls back to initSync
      notifier.setOffline(false);
      expect(container.read(activeStatusProvider)?.source, equals(StatusSource.initSync));

      // Dismiss sync -> falls back to socket
      notifier.dismissStatus('sync_status');
      expect(container.read(activeStatusProvider)?.source, equals(StatusSource.socket));

      // Connect socket -> no statuses left
      notifier.setSocketStatus(isConnected: true);
      expect(container.read(activeStatusProvider), isNull);
    });

    test('updateProgress modifies existing status item', () {
      final notifier = container.read(statusProvider.notifier);

      notifier.setSyncProgress(
        title: 'Initial',
        message: 'Step 1',
        progress: 0.1,
      );

      notifier.updateProgress('sync_status', progress: 0.8, message: 'Step 2');

      final active = container.read(activeStatusProvider);
      expect(active?.progress, equals(0.8));
      expect(active?.content, equals(['Step 2']));
    });

    test('clearSource removes all items from a given source', () {
      final notifier = container.read(statusProvider.notifier);

      notifier.setApiError('Error 1');
      notifier.setApiError('Error 2');
      notifier.setOffline(true);

      expect(container.read(statusProvider).activeStatuses.length, equals(3));

      notifier.clearSource(StatusSource.apiGateway);
      expect(container.read(statusProvider).activeStatuses.length, equals(1));
      expect(container.read(activeStatusProvider)?.source, equals(StatusSource.network));
    });

    test('localized string builders resolve properly against AppLocalizations in English and Italian', () {
      final l10nEn = lookupAppLocalizations(const Locale('en'));

      final item = StatusItem(
        id: 'test_l10n',
        source: StatusSource.initSync,
        type: StatusMessageType.info,
        titleBuilder: (l) => l.syncInitTitle,
        contentBuilders: [
          (l) => l.syncProgressMessage(10, 50),
        ],
      );

      expect(item.titleBuilder!(l10nEn), equals('Account Initialization'));
      expect(item.contentBuilders!.first(l10nEn), contains('10'));
      expect(item.contentBuilders!.first(l10nEn), contains('50'));

      final l10nIt = lookupAppLocalizations(const Locale('it'));
      expect(item.titleBuilder!(l10nIt), equals('Inizializzazione Account'));
      expect(item.contentBuilders!.first(l10nIt), contains('10'));
      expect(item.contentBuilders!.first(l10nIt), contains('50'));
    });
  });
}
