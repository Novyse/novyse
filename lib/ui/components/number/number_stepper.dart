import 'package:flutter/material.dart';

/// Compact numeric input: a `-` and `+` button on each side of a centred value.
///
/// Controlled widget: [value] is owned by the caller and every change is
/// reported through [onChanged]. Steps are clamped to [min]..[max], and the
/// buttons are disabled at those bounds. A [value] outside the bounds (set by
/// the caller) is rendered in the error colour.
class NumberStepper extends StatelessWidget {
  final double value;
  final double step;
  final double min;
  final double max;

  /// Decimals shown and kept after each step (0 = integers).
  final int fractionDigits;
  final bool hasError;
  final ValueChanged<double> onChanged;

  const NumberStepper({
    super.key,
    required this.value,
    required this.step,
    required this.min,
    required this.max,
    required this.onChanged,
    this.hasError = false,
    this.fractionDigits = 0,
  }) : assert(step > 0),
       assert(min <= max),
       assert(fractionDigits >= 0);

  bool get _outOfRange => value < min || value > max;
  bool get _canDecrement => value > min;
  bool get _canIncrement => value < max;

  void _change(double delta) {
    final next = (value + delta).clamp(min, max).toDouble();
    onChanged(double.parse(next.toStringAsFixed(fractionDigits)));
  }

  void _jumpToMin() {
    if (value == min) return;
    onChanged(double.parse(min.toStringAsFixed(fractionDigits)));
  }

  void _jumpToMax() {
    if (value == max) return;
    onChanged(double.parse(max.toStringAsFixed(fractionDigits)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final valueColor = (_outOfRange || hasError) ? scheme.error : scheme.onSurface;

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        GestureDetector(
          onLongPress: _canDecrement ? _jumpToMin : null,
          child: IconButton(
            key: const ValueKey('number_stepper_decrement'),
            icon: const Icon(Icons.remove_rounded),
            onPressed: _canDecrement ? () => _change(-step) : null,
          ),
        ),
        SizedBox(
          width: 96,
          child: Text(
            value.toStringAsFixed(fractionDigits),
            key: const ValueKey('number_stepper_value'),
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: valueColor,
            ),
          ),
        ),
        GestureDetector(
          onLongPress: _canIncrement ? _jumpToMax : null,
          child: IconButton(
            key: const ValueKey('number_stepper_increment'),
            icon: const Icon(Icons.add_rounded),
            onPressed: _canIncrement ? () => _change(step) : null,
          ),
        ),
      ],
    );
  }
}
