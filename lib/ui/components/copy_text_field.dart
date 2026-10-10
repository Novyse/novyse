import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hugeicons/hugeicons.dart';
import 'package:novyse/ui/components/huge_icon.dart';

/// Generic text value display with a trailing copy button.
///
/// After copying, the copy icon briefly changes to a checkmark.
class CopyTextField extends StatefulWidget {
  const CopyTextField({
    super.key,
    required this.value,
    required this.copyTooltip,
    required this.copiedTooltip,
    this.copiedDuration = const Duration(seconds: 2),
  });

  final String value;
  final String copyTooltip;
  final String copiedTooltip;
  final Duration copiedDuration;

  @override
  State<CopyTextField> createState() => _CopyTextFieldState();
}

class _CopyTextFieldState extends State<CopyTextField> {
  Timer? _resetTimer;
  bool _copied = false;

  @override
  void didUpdateWidget(CopyTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) _resetCopied();
  }

  @override
  void dispose() {
    _resetTimer?.cancel();
    super.dispose();
  }

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.value));
    if (!mounted) return;
    _resetTimer?.cancel();
    setState(() => _copied = true);
    _resetTimer = Timer(widget.copiedDuration, _resetCopied);
  }

  void _resetCopied() {
    _resetTimer?.cancel();
    _resetTimer = null;
    if (mounted && _copied) setState(() => _copied = false);
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      constraints: const BoxConstraints(minHeight: 52),
      decoration: BoxDecoration(
        color: colors.surfaceContainerHighest,
        border: Border.all(color: colors.outlineVariant),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              child: SelectableText(
                widget.value,
                maxLines: 2,
                style: Theme.of(context).textTheme.bodyMedium
                    ?.copyWith(fontFamily: 'monospace'),
              ),
            ),
          ),
          IconButton(
            tooltip: _copied ? widget.copiedTooltip : widget.copyTooltip,
            onPressed: _copy,
            icon: AppHugeIcon(
              icon: _copied
                  ? HugeIcons.strokeRoundedCheckmarkCircle02
                  : HugeIcons.strokeRoundedCopy01,
              color: _copied ? colors.primary : colors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
