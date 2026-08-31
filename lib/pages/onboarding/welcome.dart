import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr/qr.dart';

import '../../core/auth_service.dart';
import '../../core/l10n/l10n.dart';
import '../../core/auth/use_qr_code.dart';

class WelcomePage extends ConsumerWidget {
  const WelcomePage({super.key});

  static const _backgroundStart = Color(0xFF013480);
  static const _backgroundEnd = Color(0xFF177FC0);
  static const _panelColor = Color(0xFF9DB8D5);
  static const _headingColor = Color(0xFF073B82);
  static const _buttonColor = Color(0xFF013480);

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
                constraints: const BoxConstraints(maxWidth: 1100),
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final isCompact = constraints.maxWidth < 720;
                    return Container(
                      padding: EdgeInsets.symmetric(
                        vertical: isCompact ? 34 : 24,
                      ),
                      decoration: BoxDecoration(
                        color: _panelColor,
                        borderRadius: BorderRadius.circular(26),
                      ),
                      child: isCompact
                          ? _CompactContent(
                              onLogin: () => context.go('/login'),
                              onSignup: () => context.go('/signup'),
                            )
                          : _WideContent(
                              onLogin: () => context.go('/login'),
                              onSignup: () => context.go('/signup'),
                            ),
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

class _WideContent extends StatelessWidget {
  const _WideContent({required this.onLogin, required this.onSignup});

  final VoidCallback onLogin;
  final VoidCallback onSignup;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _WelcomeCopy(onLogin: onLogin, onSignup: onSignup),
        ),
        const SizedBox(
          height: 338,
          child: VerticalDivider(
            width: 1,
            thickness: 1,
            color: Color(0x80505D69),
          ),
        ),
        Expanded(child: _QrContent()),
      ],
    );
  }
}

class _CompactContent extends StatelessWidget {
  const _CompactContent({required this.onLogin, required this.onSignup});

  final VoidCallback onLogin;
  final VoidCallback onSignup;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _WelcomeCopy(onLogin: onLogin, onSignup: onSignup),
        const SizedBox(height: 38),
        const Divider(color: Color(0x80505D69)),
        const SizedBox(height: 30),
        _QrContent(),
      ],
    );
  }
}

class _WelcomeCopy extends StatelessWidget {
  const _WelcomeCopy({required this.onLogin, required this.onSignup});

  final VoidCallback onLogin;
  final VoidCallback onSignup;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Image.asset(
          'assets/images/logo-novyse-512.png',
          width: 150,
          height: 150,
        ),
        const SizedBox(height: 16),
        Text(
          AppLocalizations.of(context)!.welcomeTitle,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: WelcomePage._headingColor,
            fontSize: 40,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 36),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _WelcomeButton(
              label: AppLocalizations.of(context)!.register,
              onPressed: onSignup,
              backgroundColor: Colors.white,
              foregroundColor: const Color(0xFF101820),
            ),
            const SizedBox(width: 12),
            _WelcomeButton(
              label: AppLocalizations.of(context)!.login,
              onPressed: onLogin,
              backgroundColor: WelcomePage._buttonColor,
              foregroundColor: Colors.white,
            ),
          ],
        ),
      ],
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
      onAuthorized: (_) {
        ref.read(authProvider.notifier).login();
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
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                border:
                    Border.all(color: WelcomePage._headingColor, width: 1.5),
                borderRadius: BorderRadius.circular(24),
              ),
              child: hasToken
                  ? CustomPaint(painter: _QrPainter(state.qrToken!))
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

class _WelcomeButton extends StatelessWidget {
  const _WelcomeButton({
    required this.label,
    required this.onPressed,
    required this.backgroundColor,
    required this.foregroundColor,
  });

  final String label;
  final VoidCallback onPressed;
  final Color backgroundColor;
  final Color foregroundColor;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 144,
      height: 46,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: backgroundColor,
          foregroundColor: foregroundColor,
          shape: const StadiumBorder(),
          padding: EdgeInsets.zero,
        ),
        child: Text(label),
      ),
    );
  }
}

class _QrPainter extends CustomPainter {
  const _QrPainter(this.value);

  final String value;

  @override
  void paint(Canvas canvas, Size size) {
    final payload = QrPayload.fromString(value);
    final qrCode = QrCode(
      payload: payload,
      errorCorrectLevel: QrErrorCorrectLevel.high,
    );
    final image = QrImage(qrCode);
    final moduleSize = size.shortestSide / image.moduleCount;
    final paint = Paint()..color = WelcomePage._headingColor;

    for (var row = 0; row < image.moduleCount; row++) {
      for (var column = 0; column < image.moduleCount; column++) {
        if (image.isDark(row, column)) {
          canvas.drawRect(
            Rect.fromLTWH(
              column * moduleSize,
              row * moduleSize,
              moduleSize + 0.2,
              moduleSize + 0.2,
            ),
            paint,
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant _QrPainter oldDelegate) =>
      oldDelegate.value != value;
}
