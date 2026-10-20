import 'package:flutter/material.dart';

import '../../../core/config/global.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/stores/status_message_type.dart';
import '../button/app_button.dart';
import '../responsiveOverlay/responsive_overlay.dart';
import '../status/status_message.dart';
import 'turnstile_widget.dart';

/// Opens a modal containing the Cloudflare Turnstile challenge.
///
/// The returned future completes with the verification token as soon as the
/// challenge is solved (the modal closes automatically), or with `null` when
/// the user dismisses the modal without completing it.
Future<String?> showTurnstileModal(
  BuildContext context, {
  required String siteKey,
  String? action,
}) {
  final l10n = AppLocalizations.of(context)!;
  return ResponsiveOverlay.show<String>(
    context: context,
    title: l10n.turnstileTitle,
    subtitle: l10n.turnstileSubtitle,
    mode: ResponsiveOverlayMode.modal,
    child: TurnstileModal(siteKey: siteKey, action: action),
  );
}

/// Content of the Cloudflare Turnstile verification modal.
///
/// Closes itself with the token once Cloudflare reports a successful
/// verification. Errors are shown inline with a retry action.
class TurnstileModal extends StatefulWidget {
  const TurnstileModal({super.key, required this.siteKey, this.action});

  /// The Turnstile public site key.
  final String siteKey;

  /// Optional action name for reporting (e.g. 'login', 'signup').
  final String? action;

  @override
  State<TurnstileModal> createState() => _TurnstileModalState();
}

class _TurnstileModalState extends State<TurnstileModal> {
  String? _errorMessage;
  int _attempt = 0;

  void _close([String? token]) {
    Navigator.of(context, rootNavigator: true).pop(token);
  }

  void _handleToken(String token) {
    if (!mounted || token.isEmpty) return;
    _close(token);
  }

  void _handleFailure() {
    if (!mounted) return;
    setState(() {
      _errorMessage = AppLocalizations.of(context)?.turnstileVerificationFailed;
    });
  }

  void _handleError(String error) {
    debugPrint('[Turnstile] $error');
    _handleFailure();
  }

  void _retry() {
    setState(() {
      _errorMessage = null;
      _attempt++;
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: TurnstileWidget(
              key: ValueKey('turnstile_$_attempt'),
              siteKey: widget.siteKey,
              baseUrl: appUrl,
              action: widget.action,
              theme: theme.brightness == Brightness.dark ? 'dark' : 'light',
              language: Localizations.localeOf(context).languageCode,
              onTokenReceived: _handleToken,
              onTokenExpired: _handleFailure,
              onError: _handleError,
            ),
          ),
        ),
        if (_errorMessage != null) ...[
          const SizedBox(height: 12),
          StatusMessage(
            type: StatusMessageType.danger,
            content: [_errorMessage!],
            closable: false,
          ),
          const SizedBox(height: 16),
          AppButton(label: l10n.retry, onPressed: _retry),
        ],
      ],
    );
  }
}
