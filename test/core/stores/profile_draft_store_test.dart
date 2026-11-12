import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/services/api/modules/user_module.dart';
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

  test('editing the birthday marks the draft dirty', () {
    final c = container();
    final notifier = c.read(profileDraftProvider.notifier);

    notifier.setBirthday('1990-05-06');
    expect(notifier.isDirty(base), isTrue);

    notifier.clearBirthday();
    // Clearing an absent birthday is a no-op for the dirty flag.
    expect(notifier.isDirty(base), isFalse);
  });

  test('setting and clearing gradients marks the draft dirty', () {
    final c = container();
    final notifier = c.read(profileDraftProvider.notifier);

    notifier.setNameColor(
      const ProfileGradient(
        angle: 90,
        stops: [ProfileGradientStop(color: '#FF0000', position: 0)],
      ),
    );
    expect(notifier.isDirty(base), isTrue);

    notifier.discard();
    expect(notifier.isDirty(base), isFalse);

    notifier.setBannerColor(
      const ProfileGradient(
        angle: 0,
        stops: [ProfileGradientStop(color: '#00FF00', position: 0)],
      ),
    );
    expect(notifier.isDirty(base), isTrue);

    notifier.clearBannerColor();
    expect(notifier.isDirty(base), isFalse);
  });

  test('reverting a gradient to the saved value clears the dirty flag', () {
    const saved = UserModel(
      uuid: 'u1',
      name: 'Ada',
      nameColor: ProfileGradient(
        angle: 90,
        stops: [ProfileGradientStop(color: '#FF0000', position: 0)],
      ),
    );
    final c = container();
    final notifier = c.read(profileDraftProvider.notifier);

    expect(notifier.isDirty(saved), isFalse);
    notifier.setNameColor(
      const ProfileGradient(
        angle: 0,
        stops: [ProfileGradientStop(color: '#00FF00', position: 0)],
      ),
    );
    expect(notifier.isDirty(saved), isTrue);
    notifier.setNameColor(saved.nameColor!);
    expect(notifier.isDirty(saved), isFalse);
  });
}
