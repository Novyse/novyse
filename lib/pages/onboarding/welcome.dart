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

  static const _backgroundStart = Color(0xFF013480);
  static const _backgroundEnd = Color(0xFF177FC0);
  static const _panelColor = Color(0xFF9DB8D5);
  static const _headingColor = Color(0xFF073B82);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [_backgroundStart, _backgroundEnd],
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
                        color: _panelColor,
                        borderRadius: BorderRadius.circular(25),
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
          style: const TextStyle(
            color: WelcomePage._headingColor,
            fontSize: 40,
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
    );
  }
}

class _WideWelcomeContent extends StatelessWidget {
  const _WideWelcomeContent();

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 18),
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
                    style: const TextStyle(
                      color: WelcomePage._headingColor,
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
          const VerticalDivider(
            color: Color(0xFFD6E3F0),
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
                color: Colors.white,
                border: Border.all(
                  color: WelcomePage._headingColor,
                  width: 1.5,
                ),
                borderRadius: BorderRadius.circular(25),
              ),
              child: hasToken
                  ? Center(
                      child: StyledQrCode(
                        data: state.qrToken!,
                        size: 220,
                        gradientColors: const [
                          Color(0xFF2241D3),
                          Color(0xFF1FA6D3),
                        ],
                        embeddedLogo: Image.asset(
                          'assets/images/logo-novyse.png',
                          fit: BoxFit.contain,
                        ),
                      ),
                    )
                  : const Center(
                      child: CircularProgressIndicator(
                        color: WelcomePage._headingColor,
                      ),
                    ),
            ),
            const SizedBox(height: 8),
            Text(
              l10n.scanQrToLogin,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFF101820),
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
              style: const TextStyle(
                color: Color(0xFF101820),
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
