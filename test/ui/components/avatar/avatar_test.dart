import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/themes/themes.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/huge_icon.dart';

void main() {
  group('Avatar Component Tests', () {
    testWidgets('renders uppercase initial letter when no PFP is provided', (
      tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(body: Avatar(name: 'Mario Rossi', size: 40)),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('M'), findsOneWidget);
    });

    testWidgets('renders "?" when name is empty and no PFP is provided', (
      tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(body: Avatar(name: '', size: 32)),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('?'), findsOneWidget);
    });

    testWidgets('renders bookmark icon when isSavedMessages is true', (
      tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Avatar(
                name: 'Saved Messages',
                isSavedMessages: true,
                size: 48,
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.byWidgetPredicate(
          (w) =>
              w is AppHugeIcon && w.icon == HugeIcons.strokeRoundedBookmark01,
        ),
        findsOneWidget,
      );
      expect(find.text('S'), findsNothing);

      final containerFinder = find.byWidgetPredicate((widget) {
        if (widget is Container && widget.decoration is BoxDecoration) {
          final decoration = widget.decoration as BoxDecoration;
          if (decoration.gradient is LinearGradient) {
            final gradient = decoration.gradient as LinearGradient;
            return gradient.colors == Avatar.savedMessagesGradient;
          }
        }
        return false;
      });
      expect(containerFinder, findsOneWidget);
    });

    testWidgets('renders online indicator badge when isOnline is true', (
      tester,
    ) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Avatar(name: 'Alice', isOnline: true, size: 48),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Find the online indicator container with AppColors.success
      final indicatorFinder = find.byWidgetPredicate((widget) {
        if (widget is Container && widget.decoration is BoxDecoration) {
          final decoration = widget.decoration as BoxDecoration;
          return decoration.shape == BoxShape.circle &&
              decoration.color == AppColors.success;
        }
        return false;
      });

      expect(indicatorFinder, findsOneWidget);
    });

    testWidgets(
      'does not render online indicator badge when isOnline is false',
      (tester) async {
        await tester.pumpWidget(
          const ProviderScope(
            child: MaterialApp(
              home: Scaffold(
                body: Avatar(name: 'Bob', isOnline: false, size: 48),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();

        final indicatorFinder = find.byWidgetPredicate((widget) {
          if (widget is Container && widget.decoration is BoxDecoration) {
            final decoration = widget.decoration as BoxDecoration;
            return decoration.shape == BoxShape.circle &&
                decoration.color == AppColors.success;
          }
          return false;
        });

        expect(indicatorFinder, findsNothing);
      },
    );

    testWidgets('triggers onTap callback when tapped', (tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Avatar(
                name: 'Charlie',
                size: 40,
                onTap: () {
                  tapped = true;
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byType(Avatar));
      await tester.pumpAndSettle();

      expect(tapped, isTrue);
    });

    testWidgets('triggers onEdit callback when onEdit is provided and tapped', (
      tester,
    ) async {
      bool edited = false;
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Avatar(
                name: 'David',
                size: 64,
                onEdit: () {
                  edited = true;
                },
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byType(Avatar));
      await tester.pumpAndSettle();

      expect(edited, isTrue);
    });

    testWidgets('respects custom size and border dimensions', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Avatar(
                name: 'Eve',
                size: 80,
                border: Border.all(color: Colors.red, width: 3),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final avatarFinder = find.byType(Avatar);
      expect(avatarFinder, findsOneWidget);
      final RenderBox renderBox = tester.renderObject(avatarFinder);
      expect(renderBox.size.width, equals(80));
      expect(renderBox.size.height, equals(80));
    });
  });
}
