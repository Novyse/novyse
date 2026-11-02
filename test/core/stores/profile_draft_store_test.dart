import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/stores/profile_draft_store.dart';
import 'package:novyse/core/stores/user_store.dart';

void main() {
  const base = UserModel(
    uuid: 'u1',
    name: 'Ada',
    surname: 'Lovelace',
    biography: 'Math',
  );

  ProviderContainer container() {
    final c = ProviderContainer();
    addTearDown(c.dispose);
    return c;
  }

  test('untouched draft follows the baseline', () {
    final c = container();
    expect(
      c.read(profileDraftProvider.notifier).isDirty(base),
      isFalse,
    );
  });

  test('editing any field marks the draft dirty', () {
    final c = container();
    final notifier = c.read(profileDraftProvider.notifier);

    notifier.setName('Grace');
    expect(notifier.isDirty(base), isTrue);

    notifier.discard();
    expect(notifier.isDirty(base), isFalse);

    notifier.setSurname('Hopper');
    expect(notifier.isDirty(base), isTrue);

    notifier.discard();
    notifier.setBiography('COBOL');
    expect(notifier.isDirty(base), isTrue);
  });

  test('reverting to the baseline values clears the dirty flag', () {
    final c = container();
    final notifier = c.read(profileDraftProvider.notifier);

    notifier.setName('Grace');
    expect(notifier.isDirty(base), isTrue);
    notifier.setName('Ada');
    expect(notifier.isDirty(base), isFalse);
  });

  test('discard drops edits and bumps the revision', () {
    final c = container();
    final notifier = c.read(profileDraftProvider.notifier);

    notifier.setName('Grace');
    notifier.discard();

    final state = c.read(profileDraftProvider);
    expect(state.name, isNull);
    expect(state.revision, 1);
    expect(notifier.isDirty(base), isFalse);
  });
}
