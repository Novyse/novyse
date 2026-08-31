import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'dart:ui';

import '../../core/auth/onboarding_manager.dart';
import '../../core/l10n/l10n.dart';
import '../../ui/components/onboarding/onboarding_auth_card.dart';

class SignupPage extends ConsumerWidget {
  const SignupPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Signup"),
        backgroundColor: Colors.transparent, // Trasparenza base
        elevation: 0,
        scrolledUnderElevation: 0,
        flexibleSpace: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(
              sigmaX: 15,
              sigmaY: 15,
              tileMode:
                  TileMode.decal, // Impedisce artefatti sui bordi del blur
            ),
            child: Container(
              // Tinta semitrasparente per fare contrasto con il testo
              color: Colors.black.withValues(alpha: 0.2),
            ),
          ),
        ),
      ),
      extendBodyBehindAppBar: true,
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF013480), Color(0xFF177FC0)],
          ),
        ),

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
                  showLegalCheckboxes: true,
                  initialMode: OnboardingAuthMode.signup,
                  onBack: () => context.go('/welcome'),
                  onToggleMode: (mode) {
                    if (mode == OnboardingAuthMode.login) {
                      context.go('/login');
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
                          final res = await onboardingManager.signup(
                            username: username,
                            password: password,
                            name: name ?? '',
                            captchaToken: captchaToken,
                            acceptLegal: acceptLegal ?? false,
                            isOldEnough: isOldEnough ?? false,
                          );
                          if (!res.success) {
                            throw Exception(res.error ?? l10n.signupFailed);
                          }
                        }
                        if (!context.mounted) return;
                        // Navigate to login prefilled with registered username and signedup=true
                        context.go(
                          '/login?signedup=true&username=${Uri.encodeComponent(username)}',
                        );
                      },
                  onSubmit: () {
                    context.go('/login');
                  },
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
