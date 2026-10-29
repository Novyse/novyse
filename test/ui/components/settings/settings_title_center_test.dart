import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/floating/floating_style.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';

/// The settings title text must sit at the horizontal center of the bar
/// row — not just centered inside its own pill.
void main() {
  Future<void> pumpBar(
    WidgetTester tester, {
    required bool showBack,
    List<Widget>? actions,
  }) async {
    await tester.pumpWidget(
      MaterialApp(
        home: SettingsPageTemplate(
          title: 'Impostazioni',
          showBack: showBack,
          actions: actions,
          children: const [SizedBox.shrink()],
        ),
      ),
    );
    await tester.pumpAndSettle();
  }

  double textCenterDx(WidgetTester tester) {
    final element = find.text('Impostazioni').evaluate().single;
    final box = element.renderObject! as RenderBox;
    return box.localToGlobal(Offset(box.size.width / 2, 0)).dx;
  }

  Future<void> expectTitleCentered(
    WidgetTester tester,
    String label, {
    required bool showBack,
    List<Widget>? actions,
  }) async {
    await pumpBar(tester, showBack: showBack, actions: actions);
    // The bar row spans the full 800 test width (12 + 12 outer insets are
    // symmetric), so its center is the screen center.
    expect(
      textCenterDx(tester),
      moreOrLessEquals(400.0, epsilon: 1.0),
      reason: label,
    );
  }

  Widget searchAction() => const FloatingIconButton(
    icon: AppHugeIcon(icon: HugeIcons.strokeRoundedSearch01),
    onPressed: null,
  );

  testWidgets('root: no back + one action keeps title centered', (
    tester,
  ) async {
    await expectTitleCentered(
      tester,
      'settings root',
      showBack: false,
      actions: [searchAction()],
    );
  });

  testWidgets('category: back + no actions keeps title centered', (
    tester,
  ) async {
    await expectTitleCentered(tester, 'category page', showBack: true);
  });

  testWidgets('back + one action keeps title centered', (tester) async {
    await expectTitleCentered(
      tester,
      'back plus action',
      showBack: true,
      actions: [searchAction()],
    );
  });
}
