import 'dart:async';

import 'package:flutter/material.dart';
import 'package:hugeicons/hugeicons.dart';

import 'package:novyse/core/l10n/l10n.dart';

import '../huge_icon.dart';

enum StatusMessageType { success, danger, warning, info }

class StatusMessage extends StatefulWidget {
  const StatusMessage({
    super.key,
    required this.type,
    this.title,
    this.titleBuilder,
    this.content = const [],
    this.contentBuilders,
    this.visible = true,
    this.progress,
    this.timeout,
    this.onClose,
    this.closable = true,
    this.actionLabel,
    this.actionLabelBuilder,
    this.onAction,
  });

  final StatusMessageType type;
  final String? title;
  final String Function(AppLocalizations)? titleBuilder;
  final List<String> content;
  final List<String Function(AppLocalizations)>? contentBuilders;
  final bool visible;
  final double? progress; // 0.0 to 1.0, or null
  final Duration? timeout;
  final VoidCallback? onClose;
  final bool closable;
  final String? actionLabel;
  final String Function(AppLocalizations)? actionLabelBuilder;
  final VoidCallback? onAction;

  @override
  State<StatusMessage> createState() => _StatusMessageState();
}

class _StatusMessageState extends State<StatusMessage>
    with SingleTickerProviderStateMixin {
  late bool _isVisible = widget.visible;
  Timer? _timeoutTimer;
  AnimationController? _progressController;

  @override
  void initState() {
    super.initState();
    _initTimeout();
  }

  @override
  void didUpdateWidget(StatusMessage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.visible != oldWidget.visible) {
      setState(() => _isVisible = widget.visible);
      if (widget.visible) {
        _initTimeout();
      } else {
        _cancelTimeout();
      }
    }
  }

  void _initTimeout() {
    _cancelTimeout();
    if (_isVisible &&
        widget.timeout != null &&
        widget.timeout! > Duration.zero) {
      _progressController = AnimationController(
        vsync: this,
        duration: widget.timeout,
      )..forward();

      _timeoutTimer = Timer(widget.timeout!, _handleClose);
    }
  }

  void _cancelTimeout() {
    _timeoutTimer?.cancel();
    _timeoutTimer = null;
    _progressController?.dispose();
    _progressController = null;
  }

  void _handleClose() {
    if (!mounted) return;
    setState(() => _isVisible = false);
    widget.onClose?.call();
  }

  @override
  void dispose() {
    _cancelTimeout();
    super.dispose();
  }

  ({List<List<dynamic>> icon, Color text, Color bg, Color border})
  _getColors() {
    switch (widget.type) {
      case StatusMessageType.success:
        return (
          icon: HugeIcons.strokeRoundedCheckmarkCircle02,
          text: const Color(0xFF1B5E20),
          bg: const Color(0xFFE8F5E9),
          border: const Color(0xFFA5D6A7),
        );
      case StatusMessageType.danger:
        return (
          icon: HugeIcons.strokeRoundedAlertCircle,
          text: const Color(0xFFB71C1C),
          bg: const Color(0xFFFFEBEE),
          border: const Color(0xFFEF9A9A),
        );
      case StatusMessageType.warning:
        return (
          icon: HugeIcons.strokeRoundedAlert02,
          text: const Color(0xFFE65100),
          bg: const Color(0xFFFFF3E0),
          border: const Color(0xFFFFCC80),
        );
      case StatusMessageType.info:
        return (
          icon: HugeIcons.strokeRoundedInformationCircle,
          text: const Color(0xFF0D47A1),
          bg: const Color(0xFFE3F2FD),
          border: const Color(0xFF90CAF9),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final resolvedTitle = (widget.titleBuilder != null && l10n != null)
        ? widget.titleBuilder!(l10n)
        : widget.title;

    final resolvedContent = (widget.contentBuilders != null && l10n != null)
        ? widget.contentBuilders!.map((b) => b(l10n)).toList()
        : widget.content;

    final resolvedActionLabel =
        (widget.actionLabelBuilder != null && l10n != null)
        ? widget.actionLabelBuilder!(l10n)
        : widget.actionLabel;

    if (!_isVisible || (resolvedContent.isEmpty && resolvedTitle == null)) {
      return const SizedBox.shrink();
    }

    final colors = _getColors();

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 8),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: colors.bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colors.border, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(top: 2, right: 12),
                  child: AppHugeIcon(
                    icon: colors.icon,
                    color: colors.text,
                    size: 20,
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (resolvedTitle != null && resolvedTitle.isNotEmpty)
                        Text(
                          resolvedTitle,
                          style: TextStyle(
                            color: colors.text,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ...resolvedContent.map(
                        (item) => Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            resolvedContent.length > 1 ? '• $item' : item,
                            style: TextStyle(
                              color: colors.text,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                      if (widget.onAction != null &&
                          resolvedActionLabel != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: InkWell(
                            onTap: widget.onAction,
                            borderRadius: BorderRadius.circular(8),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              child: Text(
                                resolvedActionLabel,
                                style: TextStyle(
                                  color: colors.text,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  decoration: TextDecoration.underline,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                if (widget.closable)
                  InkWell(
                    onTap: _handleClose,
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.all(4),
                      child: AppHugeIcon(
                        icon: HugeIcons.strokeRoundedCancel01,
                        color: colors.text,
                        size: 16,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (widget.progress != null)
            LinearProgressIndicator(
              value: widget.progress! >= 0 ? widget.progress : null,
              backgroundColor: colors.border.withValues(alpha: 0.3),
              valueColor: AlwaysStoppedAnimation<Color>(colors.text),
              minHeight: 3,
            )
          else if (_progressController != null)
            AnimatedBuilder(
              animation: _progressController!,
              builder: (context, child) {
                return LinearProgressIndicator(
                  value: 1.0 - _progressController!.value,
                  backgroundColor: colors.border.withValues(alpha: 0.3),
                  valueColor: AlwaysStoppedAnimation<Color>(colors.text),
                  minHeight: 3,
                );
              },
            ),
        ],
      ),
    );
  }
}
