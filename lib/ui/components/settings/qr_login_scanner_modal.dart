import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:novyse/core/auth/qr_login_scanner.dart';
import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/core/utils/platform.dart';
import 'package:novyse/ui/components/appbar/floating_app_bar_style.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Opens the QR login scanner as a full-screen modal.
Future<void> showQrLoginScannerModal(
  BuildContext context, {
  QrLoginAuthenticator? authenticator,
}) {
  return showGeneralDialog<void>(
    context: context,
    useRootNavigator: true,
    barrierDismissible: false,
    barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
    barrierColor: Colors.black,
    transitionDuration: const Duration(milliseconds: 220),
    pageBuilder: (context, animation, secondaryAnimation) {
      return QrLoginScannerModal(authenticator: authenticator);
    },
    transitionBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      );
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.03),
            end: Offset.zero,
          ).animate(curved),
          child: child,
        ),
      );
    },
  );
}

/// Full-screen modal used by an already signed-in device to authorize the
/// login of another device showing a QR code.
class QrLoginScannerModal extends StatefulWidget {
  const QrLoginScannerModal({super.key, this.authenticator});

  /// Optional authenticator override used by tests.
  final QrLoginAuthenticator? authenticator;

  @override
  State<QrLoginScannerModal> createState() => _QrLoginScannerModalState();
}

class _QrLoginScannerModalState extends State<QrLoginScannerModal>
    with WidgetsBindingObserver {
  late final QrLoginScannerController _loginController;
  late final MobileScannerController _cameraController;

  @override
  void initState() {
    super.initState();
    _loginController = QrLoginScannerController(
      authenticator: widget.authenticator,
    )..addListener(_onLoginStateChanged);
    _cameraController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      formats: const [BarcodeFormat.qrCode],
    );
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _loginController
      ..removeListener(_onLoginStateChanged)
      ..dispose();
    unawaited(_cameraController.dispose());
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_cameraController.value.hasCameraPermission) return;
    if (!_loginController.canScan) return;

    switch (state) {
      case AppLifecycleState.resumed:
        unawaited(_startCamera());
      case AppLifecycleState.inactive:
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
        unawaited(_pauseCamera());
    }
  }

  void _onLoginStateChanged() {
    if (!mounted) return;
    switch (_loginController.status) {
      case QrLoginScanStatus.authenticating:
      case QrLoginScanStatus.failure:
        unawaited(_pauseCamera());
      case QrLoginScanStatus.success:
        unawaited(_stopCamera());
      case QrLoginScanStatus.idle:
        break;
    }
    setState(() {});
  }

  Future<void> _startCamera() async {
    try {
      await _cameraController.start();
    } catch (error) {
      debugPrint('[QrLoginScanner] camera start failed: $error');
    }
  }

  Future<void> _pauseCamera() async {
    try {
      await _cameraController.pause();
    } catch (error) {
      debugPrint('[QrLoginScanner] camera pause failed: $error');
    }
  }

  Future<void> _stopCamera() async {
    try {
      await _cameraController.stop();
    } catch (error) {
      debugPrint('[QrLoginScanner] camera stop failed: $error');
    }
  }

  void _onDetect(BarcodeCapture capture) {
    if (!_loginController.canScan || capture.barcodes.isEmpty) return;

    final rawValue = capture.barcodes.first.rawValue;
    if (rawValue == null || rawValue.trim().isEmpty) return;
    unawaited(_loginController.submit(rawValue));
  }

  Future<void> _retry() async {
    _loginController.reset();
    await _startCamera();
  }

  Future<void> _toggleTorch() async {
    try {
      await _cameraController.toggleTorch();
    } catch (error) {
      debugPrint('[QrLoginScanner] torch toggle failed: $error');
    }
  }

  Future<void> _switchCamera() async {
    try {
      await _cameraController.switchCamera();
    } catch (error) {
      debugPrint('[QrLoginScanner] camera switch failed: $error');
    }
  }

  void _close() {
    Navigator.of(context, rootNavigator: true).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: _cameraController,
            onDetect: _onDetect,
            fit: BoxFit.cover,
            placeholderBuilder: (_) => const ColoredBox(
              color: Colors.black,
              child: Center(child: CircularProgressIndicator()),
            ),
            errorBuilder: _buildCameraError,
          ),
          ValueListenableBuilder<MobileScannerState>(
            valueListenable: _cameraController,
            builder: (context, cameraState, _) {
              if (!_loginController.canScan || !cameraState.isRunning) {
                return const SizedBox.shrink();
              }
              return const Positioned.fill(
                child: IgnorePointer(child: _ScannerOverlay()),
              );
            },
          ),
          _buildResultOverlay(context),
          _buildHeader(context),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final l10n = context.l10n;
    final hasCameraActions =
        currentOS == AppOS.android || currentOS == AppOS.ios;

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: Row(
            children: [
              FloatingPill(
                padding: FloatingAppBarConsts.iconPillPadding,
                child: FloatingIconButton(
                  icon: const AppHugeIcon(
                    icon: HugeIcons.strokeRoundedArrowLeft01,
                  ),
                  tooltip: l10n.back,
                  onPressed: _close,
                ),
              ),
              const SizedBox(width: FloatingAppBarConsts.pillSpacing),
              Expanded(
                child: FloatingPill(
                  radius: FloatingAppBarConsts.centralRadius,
                  padding: FloatingAppBarConsts.centralTitlePadding,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                      minHeight: FloatingAppBarConsts.centralMinHeight,
                    ),
                    child: Center(
                      child: Text(
                        l10n.qrLoginScannerTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: FloatingAppBarConsts.titleStyle,
                      ),
                    ),
                  ),
                ),
              ),
              if (hasCameraActions)
                ValueListenableBuilder<MobileScannerState>(
                  valueListenable: _cameraController,
                  builder: (context, state, _) {
                    final canToggleTorch =
                        state.isInitialized &&
                        state.isRunning &&
                        state.torchState != TorchState.unavailable;
                    final canSwitchCamera =
                        state.isInitialized &&
                        state.isRunning &&
                        (state.availableCameras ?? 0) > 1;
                    if (!canToggleTorch && !canSwitchCamera) {
                      return const SizedBox.shrink();
                    }

                    final torchOn = state.torchState == TorchState.on;
                    return Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(width: FloatingAppBarConsts.pillSpacing),
                        FloatingPill(
                          padding: FloatingAppBarConsts.actionsPadding,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (canToggleTorch)
                                FloatingIconButton(
                                  icon: AppHugeIcon(
                                    icon: torchOn
                                        ? HugeIcons.strokeRoundedFlash
                                        : HugeIcons.strokeRoundedFlashOff,
                                  ),
                                  tooltip: torchOn
                                      ? l10n.qrLoginScannerTorchOn
                                      : l10n.qrLoginScannerTorchOff,
                                  onPressed: _toggleTorch,
                                ),
                              if (canSwitchCamera)
                                FloatingIconButton(
                                  icon: const AppHugeIcon(
                                    icon: HugeIcons.strokeRoundedCamera01,
                                  ),
                                  tooltip: l10n.qrLoginScannerSwitchCamera,
                                  onPressed: _switchCamera,
                                ),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResultOverlay(BuildContext context) {
    if (_loginController.canScan) return const SizedBox.shrink();

    final l10n = context.l10n;
    final theme = Theme.of(context);
    final Widget card;

    if (_loginController.isAuthenticating) {
      card = _ScannerStatusCard(
        leading: CircularProgressIndicator(color: theme.colorScheme.primary),
        title: l10n.qrLoginScannerAuthorizing,
      );
    } else if (_loginController.isSuccess) {
      card = _ScannerStatusCard(
        leading: AppHugeIcon(
          icon: HugeIcons.strokeRoundedCheckmarkCircle02,
          size: 52,
          color: theme.colorScheme.primary,
        ),
        title: l10n.qrLoginScannerSuccessTitle,
        message: l10n.qrLoginScannerSuccessMessage,
        actions: [AppButton(label: l10n.qrLoginScannerDone, onPressed: _close)],
      );
    } else {
      card = _ScannerStatusCard(
        leading: AppHugeIcon(
          icon: HugeIcons.strokeRoundedAlertCircle,
          size: 52,
          color: theme.colorScheme.error,
        ),
        title: l10n.statusError,
        message: l10n.qrLoginScannerInvalidCode,
        actions: [
          AppButton(label: l10n.qrLoginScannerScanAgain, onPressed: _retry),
          AppButton(label: l10n.cancel, onPressed: _close),
        ],
      );
    }

    return Positioned.fill(
      child: ColoredBox(
        color: Colors.black.withValues(alpha: 0.64),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: card,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCameraError(BuildContext context, MobileScannerException error) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final permissionDenied =
        error.errorCode == MobileScannerErrorCode.permissionDenied;

    return ColoredBox(
      color: Colors.black,
      child: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 100, 24, 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: _ScannerStatusCard(
                leading: AppHugeIcon(
                  icon: permissionDenied
                      ? HugeIcons.strokeRoundedCameraOff01
                      : HugeIcons.strokeRoundedAlertCircle,
                  size: 52,
                  color: theme.colorScheme.error,
                ),
                title: permissionDenied
                    ? l10n.qrLoginScannerCameraPermissionTitle
                    : l10n.qrLoginScannerCameraErrorTitle,
                message: permissionDenied
                    ? l10n.qrLoginScannerCameraPermissionMessage
                    : l10n.qrLoginScannerCameraErrorMessage,
                actions: [
                  AppButton(label: l10n.retry, onPressed: _startCamera),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ScannerStatusCard extends StatelessWidget {
  const _ScannerStatusCard({
    required this.leading,
    required this.title,
    this.message,
    this.actions = const [],
  });

  final Widget leading;
  final String title;
  final String? message;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final messageText = message;
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          leading,
          const SizedBox(height: 18),
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          if (messageText != null && messageText.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              messageText,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
          if (actions.isNotEmpty) ...[
            const SizedBox(height: 20),
            for (var i = 0; i < actions.length; i++) ...[
              if (i > 0) const SizedBox(height: 4),
              actions[i],
            ],
          ],
        ],
      ),
    );
  }
}

class _ScannerOverlay extends StatelessWidget {
  const _ScannerOverlay();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = constraints.maxHeight;
        final frameSize = math.min(width * 0.72, 300.0);
        final window = Rect.fromCenter(
          center: Offset(width / 2, height * 0.44),
          width: frameSize,
          height: frameSize,
        );

        return Stack(
          children: [
            Positioned.fill(
              child: CustomPaint(
                painter: _ScannerOverlayPainter(window: window),
              ),
            ),
            Positioned(
              left: window.left,
              top: window.bottom + 26,
              right: width - window.right,
              child: Text(
                l10n.qrLoginScannerInstruction,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                  shadows: [Shadow(color: Colors.black54, blurRadius: 8)],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _ScannerOverlayPainter extends CustomPainter {
  const _ScannerOverlayPainter({required this.window});

  final Rect window;

  @override
  void paint(Canvas canvas, Size size) {
    final background = Path()..addRect(Offset.zero & size);
    final cutout = Path()
      ..addRRect(RRect.fromRectAndRadius(window, const Radius.circular(24)));
    canvas.drawPath(
      Path.combine(PathOperation.difference, background, cutout),
      Paint()..color = Colors.black.withValues(alpha: 0.58),
    );

    canvas.drawRRect(
      RRect.fromRectAndRadius(window, const Radius.circular(24)),
      Paint()
        ..color = Colors.white.withValues(alpha: 0.35)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5,
    );

    final cornerPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;
    const cornerLength = 30.0;
    const cornerRadius = 24.0;
    const corners = [
      (Offset(-1, -1), 1.0, 1.0),
      (Offset(1, -1), -1.0, 1.0),
      (Offset(1, 1), -1.0, -1.0),
      (Offset(-1, 1), 1.0, -1.0),
    ];

    for (final (direction, dx, dy) in corners) {
      final corner = Offset(
        direction.dx < 0 ? window.left : window.right,
        direction.dy < 0 ? window.top : window.bottom,
      );
      final path = Path()
        ..moveTo(corner.dx + dx * cornerLength, corner.dy)
        ..lineTo(corner.dx + dx * cornerRadius, corner.dy)
        ..quadraticBezierTo(
          corner.dx,
          corner.dy,
          corner.dx,
          corner.dy + dy * cornerRadius,
        )
        ..lineTo(corner.dx, corner.dy + dy * cornerLength);
      canvas.drawPath(path, cornerPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _ScannerOverlayPainter oldDelegate) {
    return oldDelegate.window != window;
  }
}
