import 'package:flutter/material.dart';
import 'package:cloudflare_turnstile/cloudflare_turnstile.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/global.dart';
import '../../../core/l10n/l10n.dart';
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
    this.showTurnstile = false,
    this.showSocialButtons = true,
    this.embedded = false,
    this.showLegalCheckboxes = false,
  });

  final VoidCallback? onSubmit;
  final VoidCallback? onGooglePressed;
  final VoidCallback? onApplePressed;
  final ValueChanged<OnboardingAuthMode>? onToggleMode;
  final OnboardingAuthMode initialMode;
  final bool showTurnstile;
  final bool showSocialButtons;
  final bool embedded;
  final bool showLegalCheckboxes;

  @override
  State<OnboardingAuthCard> createState() => _OnboardingAuthCardState();
}

class _OnboardingAuthCardState extends State<OnboardingAuthCard> {
  late OnboardingAuthMode _mode = widget.initialMode;
  String? _turnstileToken;
  bool _acceptLegal = false;
  bool _isOldEnough = false;
  final _formKey = GlobalKey<FormState>();

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

  void _submit() {
    final isValid = _formKey.currentState?.validate() ?? false;
    if (!isValid ||
        (widget.showTurnstile && _turnstileToken == null) ||
        (widget.showLegalCheckboxes && (!_acceptLegal || !_isOldEnough))) {
      setState(() {});
      return;
    }
    widget.onSubmit?.call();
  }

  Future<void> _openLink(String url) async {
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    final title = _isLoginMode ? l10n.login : l10n.createAccount;
    final subtitle = _isLoginMode ? l10n.loginSubtitle : l10n.signupSubtitle;

    final content = Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: widget.embedded
            ? CrossAxisAlignment.center
            : CrossAxisAlignment.start,
        children: [
          Text(
            title,
            textAlign: widget.embedded ? TextAlign.center : null,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: widget.embedded ? TextAlign.center : null,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          if (!_isLoginMode) ...[
            OnboardingTextField(
              label: l10n.name,
              hint: l10n.nameHint,
              controller: _nameController,
              validator: (value) => value == null || value.trim().isEmpty
                  ? l10n.requiredField
                  : null,
            ),
            const SizedBox(height: 16),
          ],
          OnboardingTextField(
            label: l10n.username,
            hint: l10n.usernameHint,
            controller: _emailController,
            validator: (value) => value == null || value.trim().isEmpty
                ? l10n.requiredField
                : null,
          ),
          const SizedBox(height: 16),
          OnboardingTextField(
            label: l10n.password,
            hint: l10n.passwordHint,
            controller: _passwordController,
            obscureText: true,
            validator: (value) =>
                value == null || value.isEmpty ? l10n.requiredField : null,
          ),
          if (!_isLoginMode) ...[
            const SizedBox(height: 16),
            OnboardingTextField(
              label: l10n.confirmPassword,
              hint: l10n.confirmPasswordHint,
              controller: _confirmPasswordController,
              obscureText: true,
              validator: (value) => value != _passwordController.text
                  ? l10n.passwordsDoNotMatch
                  : null,
            ),
          ],
          if (widget.showLegalCheckboxes) ...[
            const SizedBox(height: 12),
            _LegalCheckbox(
              value: _acceptLegal,
              onChanged: (bool? value) {
                setState(() {
                  _acceptLegal = value == true;
                });
              },
              text: l10n.acceptLegal,
              links: [
                _LegalLink(label: l10n.privacyPolicy, url: privacyPolicyUrl),
                _LegalLink(label: l10n.termsOfService, url: tosUrl),
              ],
              onLinkTap: _openLink,
            ),
            _LegalCheckbox(
              value: _isOldEnough,
              onChanged: (bool? value) {
                setState(() {
                  _isOldEnough = value == true;
                });
              },
              text: l10n.atLeastSixteen,
            ),
          ],
          if (widget.showTurnstile) ...[
            const SizedBox(height: 16),
            Center(
              child: CloudflareTurnstile(
                siteKey: cloudflareTurnstilePublic,
                action: _isLoginMode ? 'login' : 'signup',
                options: TurnstileOptions(
                  theme: TurnstileTheme.dark,
                  language: Localizations.localeOf(context).languageCode,
                ),
                onTokenReceived: (token) =>
                    setState(() => _turnstileToken = token),
                onTokenExpired: () => setState(() => _turnstileToken = null),
              ),
            ),
          ],
          const SizedBox(height: 24),
          OnboardingPrimaryButton(
            label: _isLoginMode ? l10n.login : l10n.register,
            onPressed: _submit,
          ),
          if (widget.showSocialButtons) ...[
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: Divider(color: theme.colorScheme.outlineVariant),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    l10n.or,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
                Expanded(
                  child: Divider(color: theme.colorScheme.outlineVariant),
                ),
              ],
            ),
            const SizedBox(height: 20),
            OnboardingSocialButton(
              label: l10n.continueWithGoogle,
              icon: AppHugeIcon(
                icon: HugeIcons.strokeRoundedGoogle,
                color: theme.colorScheme.onSurface,
                strokeWidth: 1,
              ),
              onPressed: widget.onGooglePressed ?? () {},
            ),
            const SizedBox(height: 12),
            OnboardingSocialButton(
              label: l10n.continueWithApple,
              icon: AppHugeIcon(
                icon: HugeIcons.strokeRoundedApple,
                color: theme.colorScheme.onSurface,
                strokeWidth: 1,
              ),
              onPressed: widget.onApplePressed ?? () {},
            ),
          ],
          const SizedBox(height: 20),
          Align(
            alignment: Alignment.center,
            child: TextButton(
              onPressed: _toggleMode,
              child: Text(
                _isLoginMode ? l10n.noAccountRegister : l10n.hasAccountLogin,
              ),
            ),
          ),
        ],
      ),
    );

    if (widget.embedded) return content;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: theme.colorScheme.outlineVariant),
        boxShadow: [
          BoxShadow(
            color: theme.colorScheme.shadow.withValues(alpha: 0.06),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: content,
    );
  }
}

class _LegalLink {
  const _LegalLink({required this.label, required this.url});

  final String label;
  final String url;
}

class _LegalCheckbox extends StatelessWidget {
  const _LegalCheckbox({
    required this.value,
    required this.onChanged,
    required this.text,
    this.links = const [],
    this.onLinkTap,
  });

  final bool value;
  final ValueChanged<bool?> onChanged;
  final String text;
  final List<_LegalLink> links;
  final ValueChanged<String>? onLinkTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Checkbox(
          value: value,
          onChanged: onChanged,
          activeColor: theme.colorScheme.primary,
          checkColor: theme.colorScheme.onPrimary,
          side: BorderSide(color: theme.colorScheme.primary, width: 2),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 12),
            child: links.isEmpty
                ? Text(
                    text,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.surface,
                    ),
                  )
                : Wrap(
                    children: [
                      Text(
                        text,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.surface,
                        ),
                      ),
                      const Text(' '),
                      InkWell(
                        onTap: () => onLinkTap?.call(links[0].url),
                        child: Text(
                          links[0].label,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.primary,
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ),
                      const Text(' e '),
                      InkWell(
                        onTap: () => onLinkTap?.call(links[1].url),
                        child: Text(
                          links[1].label,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.primary,
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ],
    );
  }
}
