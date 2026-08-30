import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';

import '../huge_icon.dart';
import 'onboarding_primary_button.dart';
import 'onboarding_social_button.dart';
import 'onboarding_text_field.dart';

enum OnboardingAuthMode { login, signup }

class OnboardingAuthCard extends StatefulWidget {
  const OnboardingAuthCard({
    super.key,
    this.onSubmit,
    this.onGooglePressed,
    this.onApplePressed,
    this.onToggleMode,
    this.initialMode = OnboardingAuthMode.login,
  });

  final VoidCallback? onSubmit;
  final VoidCallback? onGooglePressed;
  final VoidCallback? onApplePressed;
  final ValueChanged<OnboardingAuthMode>? onToggleMode;
  final OnboardingAuthMode initialMode;

  @override
  State<OnboardingAuthCard> createState() => _OnboardingAuthCardState();
}

class _OnboardingAuthCardState extends State<OnboardingAuthCard> {
  late OnboardingAuthMode _mode = widget.initialMode;

  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  bool get _isLoginMode => _mode == OnboardingAuthMode.login;

  void _toggleMode() {
    setState(() {
      _mode = _isLoginMode
          ? OnboardingAuthMode.signup
          : OnboardingAuthMode.login;
    });
    widget.onToggleMode?.call(_mode);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = _isLoginMode ? 'Accedi' : 'Crea account';
    final subtitle = _isLoginMode
        ? 'Bentornato. accedi per continuare.'
        : 'Inizia subito con il tuo account';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: theme.colorScheme.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: theme.colorScheme.shadow.withOpacity(0.06),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          if (!_isLoginMode) ...[
            OnboardingTextField(
              label: 'Nome',
              hint: 'Inserisci il tuo nome',
              controller: _nameController,
            ),
            const SizedBox(height: 16),
          ],
          OnboardingTextField(
            label: 'Email',
            hint: 'name@example.com',
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 16),
          OnboardingTextField(
            label: 'Password',
            hint: '••••••••',
            controller: _passwordController,
            obscureText: true,
          ),
          if (!_isLoginMode) ...[
            const SizedBox(height: 16),
            OnboardingTextField(
              label: 'Conferma password',
              hint: 'Ripeti la password',
              controller: _confirmPasswordController,
              obscureText: true,
            ),
          ],
          const SizedBox(height: 24),
          OnboardingPrimaryButton(
            label: _isLoginMode ? 'Accedi' : 'Registrati',
            onPressed: widget.onSubmit ?? () {},
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(child: Divider(color: theme.colorScheme.outlineVariant)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  'oppure',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
              Expanded(child: Divider(color: theme.colorScheme.outlineVariant)),
            ],
          ),
          const SizedBox(height: 20),
          OnboardingSocialButton(
            label: 'Continua con Google',
            icon: AppHugeIcon(
              icon: HugeIcons.strokeRoundedGoogle,
              color: theme.colorScheme.onSurface,
              strokeWidth: 1,
            ),
            onPressed: widget.onGooglePressed ?? () {},
          ),
          const SizedBox(height: 12),
          OnboardingSocialButton(
            label: 'Continua con Apple',
            icon: AppHugeIcon(
              icon: HugeIcons.strokeRoundedApple,
              color: theme.colorScheme.onSurface,
              strokeWidth: 1,
            ),
            onPressed: widget.onApplePressed ?? () {},
          ),
          const SizedBox(height: 20),
          Align(
            alignment: Alignment.center,
            child: TextButton(
              onPressed: _toggleMode,
              child: Text(
                _isLoginMode
                    ? 'Non hai un account? Registrati'
                    : 'Hai già un account? Accedi',
              ),
            ),
          ),
        ],
      ),
    );
  }
}
