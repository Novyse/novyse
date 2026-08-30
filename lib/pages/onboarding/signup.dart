import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth_service.dart';
import '../../ui/components/onboarding/onboarding_auth_card.dart';

class SignupPage extends ConsumerWidget {
  const SignupPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF013480), Color(0xFF177FC0)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(22),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 460),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(28, 34, 28, 20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF9DB8D5),
                    borderRadius: BorderRadius.circular(26),
                  ),
                  child: OnboardingAuthCard(
                    embedded: true,
                    showTurnstile: true,
                    showSocialButtons: false,
                    showLegalCheckboxes: true,
                    initialMode: OnboardingAuthMode.signup,
                    onSubmit: () {
                      ref.read(authProvider.notifier).login();
                      context.go('/home');
                    },
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
