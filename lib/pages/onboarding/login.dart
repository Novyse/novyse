import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/onboarding_manager.dart';
import '../../core/l10n/l10n.dart';
import '../../ui/components/onboarding/onboarding_auth_card.dart';

class LoginPage extends ConsumerWidget {
  const LoginPage({super.key, this.initialUsername, this.isSignedUp = false});

  final String? initialUsername;
  final bool isSignedUp;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;

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
                    borderRadius: BorderRadius.circular(25),
                  ),
                  child: OnboardingAuthCard(
                    embedded: true,
                    showTurnstile: true,
                    initialMode: OnboardingAuthMode.login,
                    initialUsername: initialUsername,
                    successMessage: isSignedUp ? l10n.signupSuccess : null,
                    onBack: () => context.go('/welcome'),
                    onToggleMode: (mode) {
                      if (mode == OnboardingAuthMode.signup) {
                        context.go('/signup');
                      }
                    },
                    onSubmitData:
                        ({
                          required username,
                          required password,
                          name,
                          confirmPassword,
                          captchaToken,
                          acceptLegal,
                          isOldEnough,
                        }) async {
                          if (captchaToken != null) {
                            final res = await onboardingManager.login(
                              username: username,
                              password: password,
                              captchaToken: captchaToken,
                            );
                            if (!res.success) {
                              throw Exception(res.error ?? l10n.loginFailed);
                            }
                          }
                          if (!context.mounted) return;
                          context.go('/home');
                        },
                    onSubmit: () {
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
