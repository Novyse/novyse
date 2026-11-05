import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:novyse/core/appicon/app_icon_catalog.dart';
import 'package:novyse/core/stores/app_icon_draft_store.dart';

/// Baseline mirroring the catalog default.
Map<String, Object?> baseline({String iconId = 'white'}) => {
  AppIconCatalog.iconKey: iconId,
};

void main() {
  group('AppIconDraftNotifier', () {
    test('starts clean and follows the baseline', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(appIconDraftProvider.notifier);
      expect(notifier.isDirty(baseline()), isFalse);
      expect(notifier.effectiveIconId(baseline()), 'white');
    });

    test('edits mark the draft dirty', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(appIconDraftProvider.notifier);
      notifier.setIconId('sakura');
      expect(notifier.isDirty(baseline()), isTrue);
      expect(notifier.effectiveIconId(baseline()), 'sakura');

      notifier.setIconId('white');
      expect(notifier.isDirty(baseline()), isFalse);
    });

    test('discard drops edits and bumps the revision', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(appIconDraftProvider.notifier);
      final before = container.read(appIconDraftProvider).revision;
      notifier.setIconId('dark');
      expect(notifier.isDirty(baseline()), isTrue);

      notifier.discard();
      expect(notifier.isDirty(baseline()), isFalse);
      expect(notifier.effectiveIconId(baseline()), 'white');
      expect(
        container.read(appIconDraftProvider).revision,
        greaterThan(before),
      );
    });

    test('save resolves the alias, applies it, then persists', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final applied = <String?>[];
      final persisted = <String, Object?>{};
      final notifier = container.read(appIconDraftProvider.notifier);
      notifier.setIconId('sakura');

      return expectLater(
        notifier.save(
          baseline: baseline(),
          apply: (alias) async => applied.add(alias),
          persist: (key, value) async {
            persisted[key] = value;
            return true;
          },
        ),
        completion(isTrue),
      ).then((_) {
        expect(applied, ['AppIconSakura']);
        expect(persisted, {AppIconCatalog.iconKey: 'sakura'});
        // Draft kept as an explicit value matching the new baseline.
        expect(
          notifier.isDirty({...baseline(), AppIconCatalog.iconKey: 'sakura'}),
          isFalse,
        );
      });
    });

    test('save resets to the installed icon with a null alias', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final applied = <String?>[];
      final persisted = <String, Object?>{};
      final notifier = container.read(appIconDraftProvider.notifier);
      notifier.setIconId('white');

      final ok = await notifier.save(
        baseline: baseline(iconId: 'dark'),
        apply: (alias) async => applied.add(alias),
        persist: (key, value) async {
          persisted[key] = value;
          return true;
        },
      );
      expect(ok, isTrue);
      expect(applied, [null]);
      expect(persisted, {AppIconCatalog.iconKey: 'white'});
    });

    test('save returns true without work when clean', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      var applied = 0;
      final ok = await container
          .read(appIconDraftProvider.notifier)
          .save(
            baseline: baseline(),
            apply: (_) async => applied++,
            persist: (_, _) async => true,
          );
      expect(ok, isTrue);
      expect(applied, 0);
    });

    test('save fails when persistence fails and keeps the draft', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final applied = <String?>[];
      final notifier = container.read(appIconDraftProvider.notifier);
      notifier.setIconId('dark');

      final ok = await notifier.save(
        baseline: baseline(),
        apply: (alias) async => applied.add(alias),
        persist: (key, value) async => false,
      );
      expect(ok, isFalse);
      expect(applied, ['AppIconDark']);
      expect(notifier.isDirty(baseline()), isTrue);
      expect(container.read(appIconDraftProvider).saving, isFalse);
    });

    test('save fails when the native call throws and keeps the draft', () async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final notifier = container.read(appIconDraftProvider.notifier);
      notifier.setIconId('dark');

      final ok = await notifier.save(
        baseline: baseline(),
        apply: (_) async => throw Exception('nope'),
        persist: (key, value) async => true,
      );
      expect(ok, isFalse);
      expect(notifier.isDirty(baseline()), isTrue);
      expect(container.read(appIconDraftProvider).saving, isFalse);
    });
  });
}
