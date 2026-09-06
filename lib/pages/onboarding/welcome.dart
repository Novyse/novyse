import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/onboarding_manager.dart';
import '../../core/l10n/l10n.dart';
import '../../core/auth/use_qr_code.dart';
import '../../ui/components/onboarding/onboarding_primary_button.dart';
import '../../ui/components/onboarding/onboarding_secondary_button.dart';
import '../../ui/components/onboarding/styled_qr_code.dart';

class WelcomePage extends ConsumerWidget {
  const WelcomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    return Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              theme.colorScheme.primary,
              theme.colorScheme.primaryContainer,
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(22),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 840),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final isCompact = constraints.maxWidth < 720;
                    return Container(
                      padding: EdgeInsets.symmetric(
                        vertical: isCompact ? 34 : 24,
                      ),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surface.withValues(
                          alpha: 0.55,
                        ),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: isCompact
                          ? const _CompactWelcomeContent()
                          : const _WideWelcomeContent(),
                    );
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

class _CompactWelcomeContent extends StatelessWidget {
  const _CompactWelcomeContent();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'assets/images/logo-novyse.png',
          width: 140,
          height: 140,
          fit: BoxFit.contain,
        ),
        const SizedBox(height: 12),
        Text(
          l10n.welcomeTitle,
          style: TextStyle(
            color: theme.colorScheme.onSurface,
            fontSize: 40,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 40),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 25.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: 300,
                ), // Max 300px, ma si adatta se lo schermo è più piccolo
                child: SizedBox(
                  width: double.infinity,
                  child: OnboardingSecondaryButton(
                    label: l10n.register,
                    onPressed: () => context.go('/signup'),
                  ),
                ),
              ),
              const SizedBox(height: 15),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 300),
                child: SizedBox(
                  width: double.infinity,
                  child: OnboardingPrimaryButton(
                    label: l10n.login,
                    onPressed: () => context.go('/login'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _WideWelcomeContent extends StatelessWidget {
  const _WideWelcomeContent();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 25, vertical: 25),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Image.asset(
                    'assets/images/logo-novyse.png',
                    width: 150,
                    height: 150,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    l10n.welcomeTitle,
                    style: TextStyle(
                      color: theme.colorScheme.onSurface,
                      fontSize: 42,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 38),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 144,
                        child: OnboardingSecondaryButton(
                          label: l10n.register,
                          onPressed: () => context.go('/signup'),
                        ),
                      ),
                      const SizedBox(width: 14),
                      SizedBox(
                        width: 144,
                        child: OnboardingPrimaryButton(
                          label: l10n.login,
                          onPressed: () => context.go('/login'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          VerticalDivider(
            color: theme.colorScheme.outlineVariant,
            thickness: 1,
            width: 1,
          ),
          const Expanded(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 28, vertical: 18),
              child: _QrContent(),
            ),
          ),
        ],
      ),
    );
  }
}

class _QrContent extends ConsumerStatefulWidget {
  const _QrContent();

  @override
  ConsumerState<_QrContent> createState() => _QrContentState();
}

class _QrContentState extends ConsumerState<_QrContent> {
  QrCodeController? _controller;

  QrCodeController get _qrController => _controller ??= _createController();

  QrCodeController _createController() {
    return QrCodeController(
      onAuthorized: (data) async {
        await onboardingManager.setLogin(
          userUUID: data['userUUID']?.toString(),
          sessionID: data['sessionID']?.toString(),
          sessionId: data['session_id']?.toString(),
        );
        if (mounted) {
          context.go('/home');
        }
      },
    )..init();
  }

  @override
  void initState() {
    super.initState();
    _controller = _createController();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    return ListenableBuilder(
      listenable: _qrController,
      builder: (context, _) {
        final state = _qrController.state;
        final hasToken = state.qrToken != null && state.qrToken!.isNotEmpty;

        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 252,
              height: 252,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                border: Border.all(
                  color: theme.colorScheme.primary,
                  width: 1.5,
                ),
                borderRadius: BorderRadius.circular(24),
              ),
              child: hasToken
                  ? Center(
                      child: StyledQrCode(
                        data: state.qrToken!,
                        size: 220,
                        gradientColors: [
                          theme.colorScheme.primary,
                          theme.colorScheme.secondary,
                        ],
                        embeddedLogo: Image.asset(
                          'assets/images/logo-novyse.png',
                          fit: BoxFit.contain,
                        ),
                      ),
                    )
                  : Center(
                      child: CircularProgressIndicator(
                        color: theme.colorScheme.primary,
                      ),
                    ),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.scanQrToLogin,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: theme.colorScheme.onSurface,
                fontSize: 18,
                fontWeight: FontWeight.w700,
              ),
            ),
            Text(
              hasToken
                  ? l10n.qrExpiresIn(
                      QrCodeController.formatTime(state.remainingTime),
                    )
                  : '',
              style: TextStyle(
                color: theme.colorScheme.onSurfaceVariant,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        );
      },
    );
  }
}
