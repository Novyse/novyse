import 'package:flutter/material.dart';
import 'package:intl/intl.dart' as intl;

import 'package:novyse/ui/components/button/app_button.dart';
import 'package:novyse/ui/components/datetime/datetime_picker.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';

/// Opens [DatetimePicker] inside a responsive overlay
/// (bottom sheet on mobile, dialog on desktop/web).
///
/// Returns the confirmed [DateTime], or null when dismissed/cancelled.
///
/// Example:
/// ```dart
/// final picked = await showDatetimePickerOverlay(
///   context: context,
///   mode: DatetimePickerMode.dateTime,
/// );
/// ```
Future<DateTime?> showDatetimePickerOverlay({
  required BuildContext context,
  DatetimePickerMode mode = DatetimePickerMode.dateTime,
  DateTime? initialDateTime,
  int yearsBack = 50,
  int yearsForward = 50,
  String title = 'Seleziona data e ora',
  String? subtitle,
  String confirmLabel = 'Conferma',
  String cancelLabel = 'Annulla',
}) {
  return ResponsiveOverlay.show<DateTime>(
    context: context,
    title: title,
    subtitle: subtitle,
    mode: ResponsiveOverlayMode.dynamic,
    child: _DatetimePickerOverlayBody(
      mode: mode,
      initialDateTime: initialDateTime ?? DateTime.now(),
      yearsBack: yearsBack,
      yearsForward: yearsForward,
      confirmLabel: confirmLabel,
      cancelLabel: cancelLabel,
    ),
  );
}

class _DatetimePickerOverlayBody extends StatefulWidget {
  const _DatetimePickerOverlayBody({
    required this.mode,
    required this.initialDateTime,
    required this.yearsBack,
    required this.yearsForward,
    required this.confirmLabel,
    required this.cancelLabel,
  });

  final DatetimePickerMode mode;
  final DateTime initialDateTime;
  final int yearsBack;
  final int yearsForward;
  final String confirmLabel;
  final String cancelLabel;

  @override
  State<_DatetimePickerOverlayBody> createState() =>
      _DatetimePickerOverlayBodyState();
}

class _DatetimePickerOverlayBodyState
    extends State<_DatetimePickerOverlayBody> {
  late DateTime _current;

  @override
  void initState() {
    super.initState();
    _current = widget.initialDateTime;
  }

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).toString();
    final pattern = switch (widget.mode) {
      DatetimePickerMode.date => 'EEEE d MMMM y',
      DatetimePickerMode.time => 'HH:mm',
      DatetimePickerMode.dateTime => 'EEEE d MMMM y · HH:mm',
    };
    final preview = _capitalized(
      intl.DateFormat(pattern, locale).format(_current),
    );

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Live preview of the snapped selection.
        Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary.withValues(
                alpha: 0.10,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              preview,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
                color: Theme.of(context).colorScheme.primary,
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ),
        const SizedBox(height: 12),
        DatetimePicker(
          mode: widget.mode,
          initialDateTime: widget.initialDateTime,
          yearsBack: widget.yearsBack,
          yearsForward: widget.yearsForward,
          onChanged: (next) => setState(() => _current = next),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: AppButton(
                label: widget.cancelLabel,
                onPressed: () =>
                    Navigator.of(context, rootNavigator: true).pop(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: AppButton(
                label: widget.confirmLabel,
                onPressed: () => Navigator.of(
                  context,
                  rootNavigator: true,
                ).pop(_current),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

String _capitalized(String s) =>
    s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
