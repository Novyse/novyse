import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:qr/qr.dart';

class StyledQrCode extends StatelessWidget {
  const StyledQrCode({
    super.key,
    required this.data,
    this.size = 220,
    this.gradientColors = const [Color(0xFF2241D3), Color(0xFF1FA6D3)],
    this.embeddedLogo,
    this.logoSize = 50,
    this.logoRadius = 10,
  });

  final String data;
  final double size;
  final List<Color> gradientColors;
  final Widget? embeddedLogo;
  final double logoSize;
  final double logoRadius;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _StyledQrPainter(
              data: data,
              gradientColors: gradientColors,
              hasCenterLogo: embeddedLogo != null,
              logoSize: logoSize,
            ),
          ),
          if (embeddedLogo != null)
            Container(
              width: logoSize,
              height: logoSize,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(logoRadius),
              ),
              padding: const EdgeInsets.all(2),
              alignment: Alignment.center,
              child: embeddedLogo!,
            ),
        ],
      ),
    );
  }
}

class _StyledQrPainter extends CustomPainter {
  _StyledQrPainter({
    required this.data,
    required this.gradientColors,
    required this.hasCenterLogo,
    required this.logoSize,
  });

  final String data;
  final List<Color> gradientColors;
  final bool hasCenterLogo;
  final double logoSize;

  @override
  void paint(Canvas canvas, Size size) {
    final payload = QrPayload.fromString(data);
    final qrCode = QrCode(
      payload: payload,
      errorCorrectLevel: QrErrorCorrectLevel.high,
    );
    final image = QrImage(qrCode);
    final moduleCount = image.moduleCount;
    final moduleSize = size.width / moduleCount;

    final paint = Paint()
      ..shader = ui.Gradient.linear(
        Offset.zero,
        Offset(0, size.height),
        gradientColors,
      )
      ..isAntiAlias = true;

    final halfLogoSize = hasCenterLogo ? (logoSize / 2.0) : 0.0;
    final centerX = size.width / 2.0;
    final centerY = size.height / 2.0;
    final logoRect = hasCenterLogo
        ? Rect.fromLTRB(
            centerX - halfLogoSize,
            centerY - halfLogoSize,
            centerX + halfLogoSize,
            centerY + halfLogoSize,
          )
        : null;

    // Draw finder patterns with smooth custom rounded shapes
    _drawFinderPattern(canvas, paint, 0, 0, moduleSize);
    _drawFinderPattern(
      canvas,
      paint,
      (moduleCount - 7) * moduleSize,
      0,
      moduleSize,
    );
    _drawFinderPattern(
      canvas,
      paint,
      0,
      (moduleCount - 7) * moduleSize,
      moduleSize,
    );

    // Draw data modules
    for (var r = 0; r < moduleCount; r++) {
      for (var c = 0; c < moduleCount; c++) {
        // Skip finder pattern zones (7x7 modules at 3 corners)
        final isTopLeftFinder = r < 7 && c < 7;
        final isTopRightFinder = r < 7 && c >= moduleCount - 7;
        final isBottomLeftFinder = r >= moduleCount - 7 && c < 7;

        if (isTopLeftFinder || isTopRightFinder || isBottomLeftFinder) {
          continue;
        }

        final cellRect = Rect.fromLTWH(
          c * moduleSize,
          r * moduleSize,
          moduleSize,
          moduleSize,
        );

        // Skip exact area covered by the logo without excess padding
        if (logoRect != null && logoRect.overlaps(cellRect)) {
          continue;
        }

        if (image.isDark(r, c)) {
          final dotRect = Rect.fromLTWH(
            c * moduleSize + moduleSize * 0.08,
            r * moduleSize + moduleSize * 0.08,
            moduleSize * 0.84,
            moduleSize * 0.84,
          );
          canvas.drawRRect(
            RRect.fromRectAndRadius(
              dotRect,
              Radius.circular(moduleSize * 0.38),
            ),
            paint,
          );
        }
      }
    }
  }

  void _drawFinderPattern(
    Canvas canvas,
    Paint paint,
    double x,
    double y,
    double moduleSize,
  ) {
    final outerRect = Rect.fromLTWH(
      x + moduleSize * 0.5,
      y + moduleSize * 0.5,
      moduleSize * 6,
      moduleSize * 6,
    );

    // Outer rounded square border
    final strokePaint = Paint()
      ..shader = paint.shader
      ..style = PaintingStyle.stroke
      ..strokeWidth = moduleSize * 0.95
      ..isAntiAlias = true;

    canvas.drawRRect(
      RRect.fromRectAndRadius(outerRect, Radius.circular(moduleSize * 1.8)),
      strokePaint,
    );

    // Inner rounded square filled
    final innerRect = Rect.fromLTWH(
      x + moduleSize * 2,
      y + moduleSize * 2,
      moduleSize * 3,
      moduleSize * 3,
    );

    canvas.drawRRect(
      RRect.fromRectAndRadius(innerRect, Radius.circular(moduleSize * 0.9)),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _StyledQrPainter oldDelegate) =>
      oldDelegate.data != data ||
      oldDelegate.gradientColors != gradientColors ||
      oldDelegate.hasCenterLogo != hasCenterLogo ||
      oldDelegate.logoSize != logoSize;
}
