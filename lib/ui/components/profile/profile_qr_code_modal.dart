import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/core/config/global.dart';
import 'package:novyse/ui/components/avatar/avatar.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';
import 'package:qr/qr.dart';


Future<void> showProfileQrCodeModal(
  BuildContext context, {
  required String username,
  String? profilePictureUUID,
}) {
  return ResponsiveOverlay.show<void>(
    context: context,
    title: '@$username',
    child: _ProfileQrCodeBody(
      username: username,
      profilePictureUUID: profilePictureUUID,
    ),
  );
}

class _ProfileQrCodeBody extends StatefulWidget {
  const _ProfileQrCodeBody({required this.username, this.profilePictureUUID});

  final String username;
  final String? profilePictureUUID;

  @override
  State<_ProfileQrCodeBody> createState() => _ProfileQrCodeBodyState();
}

class _ProfileQrCodeBodyState extends State<_ProfileQrCodeBody> {
  bool _copied = false;
  Timer? _resetTimer;

  @override
  void dispose() {
    _resetTimer?.cancel();
    super.dispose();
  }

  String get _profileLink => '$appUrl/profile/${widget.username}';

  Future<void> _copyLink() async {
    await Clipboard.setData(ClipboardData(text: _profileLink));
    if (!mounted) return;
    setState(() => _copied = true);
    _resetTimer?.cancel();
    _resetTimer = Timer(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Avatar(
          uuid: widget.profilePictureUUID,
          name: widget.username,
          size: 80,
          isOnline: false,
        ),
        const SizedBox(height: 15),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: 200,
            height: 200,
            child: CustomPaint(
              painter: _QrCodePainter(
                matrix: _buildMatrix(_profileLink),
                gradient: LinearGradient(
                  colors: [scheme.primary, scheme.secondary],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          '@${widget.username.toUpperCase()}',
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w800,
            color: scheme.primary,
          ),
        ),
        const SizedBox(height: 16),
        InkWell(
          onTap: _copyLink,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: scheme.outlineVariant),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _profileLink,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall,
                  ),
                ),
                const SizedBox(width: 8),
                AppHugeIcon(
                  icon: _copied
                      ? HugeIcons.strokeRoundedTick02
                      : HugeIcons.strokeRoundedCopy01,
                  size: 20,
                  color: _copied ? scheme.primary : scheme.onSurfaceVariant,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}


List<List<bool>> _buildMatrix(String data) {
  final code = QrCode(payload: QrPayload.fromString(data));
  final image = QrImage(code);
  final count = image.moduleCount;
  return List.generate(
    count,
    (row) => List.generate(count, (col) => image.isDark(row, col)),
  );
}


class _QrCodePainter extends CustomPainter {
  _QrCodePainter({required this.matrix, required this.gradient});

  final List<List<bool>> matrix;
  final Gradient gradient;

  @override
  void paint(Canvas canvas, Size size) {
    if (matrix.isEmpty) return;
    final count = matrix.length;
    final cell = size.width / count;
    final paint = Paint()
      ..shader = gradient.createShader(Offset.zero & size);
    for (var y = 0; y < count; y++) {
      for (var x = 0; x < count; x++) {
        if (matrix[y][x]) {
          canvas.drawRect(
            Rect.fromLTWH(x * cell, y * cell, cell + 0.5, cell + 0.5),
            paint,
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(_QrCodePainter oldDelegate) => false;
}
