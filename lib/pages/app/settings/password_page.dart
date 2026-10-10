import 'package:flutter/material.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/services/auth.dart' as auth_service;
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';

/// Password settings page with only the new-password form, as in development.
class PasswordPage extends StatefulWidget {
  const PasswordPage({super.key});

  @override
  State<PasswordPage> createState() => _PasswordPageState();
}

class _PasswordPageState extends State<PasswordPage> {
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmation = true;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    final l10n = AppLocalizations.of(context)!;
    final password = _passwordController.text;
    if (password.isEmpty || _confirmController.text.isEmpty) {
      setState(() {
        _error = l10n.settingsPasswordRequired;
        _success = null;
      });
      return;
    }
    if (password != _confirmController.text) {
      setState(() {
        _error = l10n.settingsPasswordsDoNotMatch;
        _success = null;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _success = null;
    });
    try {
      // The Flutter auth SDK exposes the OPAQUE setup flow as `setup`.
      final response = await auth_service.auth.settings.opaque.setup(password);
      if (!mounted) return;
      if (response.success) {
        _passwordController.clear();
        _confirmController.clear();
        setState(() => _success = l10n.settingsPasswordChanged);
      } else {
        setState(
          () => _error = response.error ?? l10n.settingsPasswordChangeFailed,
        );
      }
    } catch (_) {
      if (mounted) setState(() => _error = l10n.settingsPasswordChangeFailed);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final colors = Theme.of(context).colorScheme;
    return SettingsPageTemplate(
      title: l10n.settingsItemPasswordTitle,
      children: [
        SettingsSection(
          children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_error != null || _success != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _error == null
                            ? colors.primaryContainer
                            : colors.errorContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(_error ?? _success!),
                    ),
                    const SizedBox(height: 16),
                  ],
                  TextField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    autocorrect: false,
                    enableSuggestions: false,
                    keyboardType: TextInputType.visiblePassword,
                    autofillHints: const [AutofillHints.newPassword],
                    textInputAction: TextInputAction.next,
                    decoration: InputDecoration(
                      labelText: l10n.settingsNewPassword,
                      hintText: l10n.settingsNewPassword,
                      suffixIcon: IconButton(
                        tooltip: _obscurePassword
                            ? l10n.showPassword
                            : l10n.hidePassword,
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                        onPressed: () => setState(
                          () => _obscurePassword = !_obscurePassword,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _confirmController,
                    obscureText: _obscureConfirmation,
                    autocorrect: false,
                    enableSuggestions: false,
                    keyboardType: TextInputType.visiblePassword,
                    autofillHints: const [AutofillHints.newPassword],
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _changePassword(),
                    decoration: InputDecoration(
                      labelText: l10n.settingsConfirmNewPassword,
                      hintText: l10n.settingsConfirmNewPassword,
                      suffixIcon: IconButton(
                        tooltip: _obscureConfirmation
                            ? l10n.showPassword
                            : l10n.hidePassword,
                        icon: Icon(
                          _obscureConfirmation
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                        onPressed: () => setState(
                          () => _obscureConfirmation = !_obscureConfirmation,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  AppButton(
                    label: _isLoading
                        ? l10n.settingsPasswordChanging
                        : l10n.settingsChangePassword,
                    isLoading: _isLoading,
                    onPressed: _changePassword,
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}
