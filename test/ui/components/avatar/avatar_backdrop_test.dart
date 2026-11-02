import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/ui/components/avatar/avatar_backdrop.dart';

void main() {
  test('gradientFromScheme uses primary container then primary', () {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF2563EB),
      dynamicSchemeVariant: DynamicSchemeVariant.content,
    );
    expect(AvatarBackdrop.gradientFromScheme(scheme), [
      scheme.primaryContainer,
      scheme.primary,
    ]);
  });
}
