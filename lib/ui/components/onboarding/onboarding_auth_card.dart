import 'dart:async';

import 'package:flutter/material.dart';
import 'package:cloudflare_turnstile/cloudflare_turnstile.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/auth/validator.dart';
import '../../../core/config/global.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/services/api_gateway.dart';
import '../huge_icon.dart';
import '../status/status_message.dart';
import 'onboarding_primary_button.dart';
import 'onboarding_secondary_button.dart';
import 'onboarding_text_field.dart';

enum OnboardingAuthMode { login, signup }

typedef OnboardingSubmitCallback = FutureOr<void> Function({
  required String username,
  required String password,
  String? name,
  String? confirmPassword,
  String? captchaToken,
  bool? acceptLegal,
  bool? isOldEnough,
});

class OnboardingAuthCard extends StatefulWidget {
  const OnboardingAuthCard({
    super.key,
    this.onSubmit,
    this.onSubmitData,
    this.onToggleMode,
    this.onBack,
    this.initialMode = OnboardingAuthMode.login,
    this.initialUsername,
    this.successMessage,
    this.errorMessage,
    this.showTurnstile = false,
    this.embedded = false,
    this.showLegalCheckboxes = false,
    this.gateway,
  });

  final VoidCallback? onSubmit;
  final OnboardingSubmitCallback? onSubmitData;
  final ValueChanged<OnboardingAuthMode>? onToggleMode;
  final VoidCallback? onBack;
  final OnboardingAuthMode initialMode;
  final String? initialUsername;
  final String? successMessage;
  final String? errorMessage;
  final bool showTurnstile;
  final bool embedded;
  final bool showLegalCheckboxes;
  final Gateway? gateway;

  @override
  State<OnboardingAuthCard> createState() => _OnboardingAuthCardState();
}

class _OnboardingAuthCardState extends State<OnboardingAuthCard> {
  late OnboardingAuthMode _mode = widget.initialMode;
  String? _turnstileToken;
  bool _acceptLegal = false;
  bool _isOldEnough = false;
  bool _isLoading = false;
  bool _isCheckingHandle = false;
  bool? _isHandleAvailable;
  String? _statusError;
  String? _statusSuccess;
  bool _dismissedSuccess = false;
  final _formKey = GlobalKey<FormState>();

  late final TextEditingController _usernameController;
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  Timer? _handleDebounceTimer;
  String? _handleApiError;

  @override
  void initState() {
    super.initState();
    _usernameController = TextEditingController(
      text: widget.initialUsername ?? '',
    );
    _statusSuccess = widget.successMessage;
    _statusError = widget.errorMessage;

    _usernameController.addListener(_onFormUpdated);
    _passwordController.addListener(_onFormUpdated);
    _nameController.addListener(_onFormUpdated);
    _confirmPasswordController.addListener(_onFormUpdated);
  }

  void _onFormUpdated() {
    setState(() {});
  }

  @override
  void didUpdateWidget(OnboardingAuthCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.successMessage != oldWidget.successMessage) {
      setState(() {
        _statusSuccess = widget.successMessage;
        _dismissedSuccess = false;
      });
    }
    if (widget.errorMessage != oldWidget.errorMessage) {
      setState(() => _statusError = widget.errorMessage);
    }
    if (widget.initialUsername != oldWidget.initialUsername &&
        widget.initialUsername != null) {
      _usernameController.text = widget.initialUsername!;
    }
  }

  @override
  void dispose() {
    _handleDebounceTimer?.cancel();
    _usernameController.removeListener(_onFormUpdated);
    _passwordController.removeListener(_onFormUpdated);
    _nameController.removeListener(_onFormUpdated);
    _confirmPasswordController.removeListener(_onFormUpdated);

    _usernameController.dispose();
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
      _handleApiError = null;
      _isHandleAvailable = null;
      _isCheckingHandle = false;
      _statusError = null;
      _statusSuccess = null;
      _dismissedSuccess = false;
    });
    widget.onToggleMode?.call(_mode);
  }

  void _onUsernameChanged(String value) {
    _handleDebounceTimer?.cancel();
    if (_statusError != null) {
      setState(() => _statusError = null);
    }
    if (_handleApiError != null) {
      setState(() => _handleApiError = null);
    }
    final trimmed = value.trim().toLowerCase();
    if (_isLoginMode || trimmed.isEmpty) {
      setState(() {
        _isCheckingHandle = false;
        _isHandleAvailable = null;
      });
      return;
    }

    final basicError = Validator.validateHandle(
      trimmed,
      AppLocalizations.of(context),
    );
    if (basicError != null) {
      setState(() {
        _isCheckingHandle = false;
        _isHandleAvailable = false;
      });
      return;
    }

    setState(() {
      _isCheckingHandle = true;
      _isHandleAvailable = null;
    });

    _handleDebounceTimer = Timer(const Duration(milliseconds: 600), () async {
      final gw = widget.gateway ?? Gateway();
      try {
        final res = await gw.check.handle(trimmed);
        if (mounted) {
          setState(() {
            _isCheckingHandle = false;
            if (res.success && res.available == false) {
              _isHandleAvailable = false;
              _handleApiError =
                  AppLocalizations.of(context)?.handleAlreadyInUse ??
                  'Username is already in use';
            } else if (res.success && res.available == true) {
              _isHandleAvailable = true;
              _handleApiError = null;
            } else {
              _isHandleAvailable = null;
              _handleApiError = null;
            }
          });
          _formKey.currentState?.validate();
        }
      } catch (_) {
        if (mounted) {
          setState(() {
            _isCheckingHandle = false;
            _isHandleAvailable = false;
            _handleApiError =
                AppLocalizations.of(context)?.availabilityError ??
                'Unable to verify username availability';
          });
          _formKey.currentState?.validate();
        }
      }
    });
  }

  bool _isSubmitEnabled(AppLocalizations? l10n) {
    if (_isLoading) return false;

    if (_isLoginMode) {
      final hasUsername = _usernameController.text.trim().isNotEmpty;
      final hasPassword = _passwordController.text.isNotEmpty;
      final hasTurnstile = !widget.showTurnstile || _turnstileToken != null;
      return hasUsername && hasPassword && hasTurnstile;
    }

    // Signup validation
    final nameValid =
        _nameController.text.trim().isNotEmpty &&
        Validator.validateName(_nameController.text.trim(), l10n) == null;

    final handleText = _usernameController.text.trim().toLowerCase();
    final handleFormatValid =
        handleText.isNotEmpty &&
        Validator.validateHandle(handleText, l10n) == null;
    final handleValid =
        handleFormatValid &&
        !_isCheckingHandle &&
        _handleApiError == null &&
        _isHandleAvailable == true;

    final passwordValid =
        _passwordController.text.isNotEmpty &&
        Validator.validatePassword(_passwordController.text, l10n) == null;

    final confirmValid =
        _confirmPasswordController.text.isNotEmpty &&
        _confirmPasswordController.text == _passwordController.text;

    final legalValid =
        !widget.showLegalCheckboxes || (_acceptLegal && _isOldEnough);

    final turnstileValid = !widget.showTurnstile || _turnstileToken != null;

    return nameValid &&
        handleValid &&
        passwordValid &&
        confirmValid &&
        legalValid &&
        turnstileValid;
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _statusError = null;
    });

    if (!_isSubmitEnabled(l10n)) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      if (widget.onSubmitData != null) {
        await widget.onSubmitData!(
          username: _usernameController.text.trim(),
          password: _passwordController.text,
          name: _isLoginMode ? null : _nameController.text.trim(),
          confirmPassword: _isLoginMode
              ? null
              : _confirmPasswordController.text,
          captchaToken: _turnstileToken,
          acceptLegal: _acceptLegal,
          isOldEnough: _isOldEnough,
        );
      } else {
        widget.onSubmit?.call();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _statusError = e.toString().replaceAll('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _openLink(String url) async {
    await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
  }

  Widget _buildSecuredByOpaque(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Text(
            '${l10n.securedBy} ',
            style: const TextStyle(
              color: Color(0xFF505D69),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          InkWell(
            onTap: () => _openLink('https://opaque-auth.com/'),
            child: const Text(
              'OPAQUE',
              style: TextStyle(
                color: Color(0xFF013480),
                fontSize: 12,
                fontWeight: FontWeight.w700,
                decoration: TextDecoration.underline,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget? _buildUsernameSuffix() {
    if (_isLoginMode) return null;

    if (_isCheckingHandle) {
      return const Padding(
        padding: EdgeInsets.all(14),
        child: SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: Color(0xFF003B70),
          ),
        ),
      );
    }

    if (_isHandleAvailable == true && _handleApiError == null) {
      return const Padding(
        padding: EdgeInsets.all(12),
        child: AppHugeIcon(
          icon: HugeIcons.strokeRoundedCheckmarkCircle02,
          color: Color(0xFF2E7D32),
          size: 20,
        ),
      );
    }

    if (_handleApiError != null) {
      return const Padding(
        padding: EdgeInsets.all(12),
        child: AppHugeIcon(
          icon: HugeIcons.strokeRoundedAlertCircle,
          color: Color(0xFFC62828),
          size: 20,
        ),
      );
    }

    return null;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    final title = _isLoginMode ? l10n.login : l10n.createAccount;
    final subtitle = _isLoginMode ? l10n.loginSubtitle : l10n.signupSubtitle;

    final displaySuccess = !_dismissedSuccess
        ? (_statusSuccess ?? widget.successMessage)
        : null;
    final displayError = _statusError ?? widget.errorMessage;
    final canSubmit = _isSubmitEnabled(l10n);

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
          if (displaySuccess != null && displaySuccess.isNotEmpty) ...[
            const SizedBox(height: 12),
            StatusMessage(
              type: StatusMessageType.success,
              title: l10n.statusSuccess,
              content: [displaySuccess],
              onClose: () => setState(() {
                _statusSuccess = null;
                _dismissedSuccess = true;
              }),
            ),
          ],
          if (displayError != null && displayError.isNotEmpty) ...[
            const SizedBox(height: 12),
            StatusMessage(
              type: StatusMessageType.danger,
              title: l10n.statusError,
              content: [displayError],
              onClose: () => setState(() => _statusError = null),
            ),
          ],
          const SizedBox(height: 20),
          if (!_isLoginMode) ...[
            OnboardingTextField(
              label: l10n.name,
              hint: l10n.nameHint,
              controller: _nameController,
              autovalidateMode: AutovalidateMode.onUserInteraction,
              validator: (value) => Validator.validateName(value, l10n),
            ),
            const SizedBox(height: 16),
          ],
          OnboardingTextField(
            label: l10n.username,
            hint: l10n.usernameHint,
            controller: _usernameController,
            onChanged: _onUsernameChanged,
            suffixIcon: _buildUsernameSuffix(),
            autovalidateMode: _isLoginMode
                ? AutovalidateMode.disabled
                : AutovalidateMode.onUserInteraction,
            validator: _isLoginMode
                ? null
                : (value) =>
                      Validator.validateHandle(value, l10n) ?? _handleApiError,
          ),
          const SizedBox(height: 16),
          OnboardingTextField(
            label: l10n.password,
            hint: l10n.passwordHint,
            controller: _passwordController,
            obscureText: true,
            autovalidateMode: _isLoginMode
                ? AutovalidateMode.disabled
                : AutovalidateMode.onUserInteraction,
            validator: _isLoginMode
                ? null
                : (value) => Validator.validatePassword(value, l10n),
          ),
          if (_isLoginMode) _buildSecuredByOpaque(context),
          if (!_isLoginMode) ...[
            const SizedBox(height: 16),
            OnboardingTextField(
              label: l10n.confirmPassword,
              hint: l10n.confirmPasswordHint,
              controller: _confirmPasswordController,
              obscureText: true,
              autovalidateMode: AutovalidateMode.onUserInteraction,
              validator: (value) => Validator.validateConfirmPassword(
                value,
                _passwordController.text,
                l10n,
              ),
            ),
            _buildSecuredByOpaque(context),
          ],
          if (widget.showLegalCheckboxes) ...[
            const SizedBox(height: 12),
            _LegalCheckbox(
              value: _acceptLegal,
              onChanged: (bool? value) {
                setState(() {
                  _acceptLegal = value == true;
                  if (_acceptLegal && _isOldEnough) _statusError = null;
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
                  if (_acceptLegal && _isOldEnough) _statusError = null;
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
                onTokenReceived: (token) => setState(() {
                  _turnstileToken = token;
                  _statusError = null;
                }),
                onTokenExpired: () => setState(() => _turnstileToken = null),
              ),
            ),
          ],
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: OnboardingSecondaryButton(
                  label: l10n.back,
                  onPressed:
                      widget.onBack ?? () => Navigator.of(context).maybePop(),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OnboardingPrimaryButton(
                  label: _isLoginMode ? l10n.login : l10n.register,
                  isLoading: _isLoading,
                  onPressed: canSubmit ? _submit : null,
                ),
              ),
            ],
          ),
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
        borderRadius: BorderRadius.circular(25),
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
