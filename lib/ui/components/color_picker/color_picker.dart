import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'package:hugeicons/hugeicons.dart';

import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/huge_icon.dart';
import 'package:novyse/ui/components/onboarding/onboarding_text_field.dart';
import 'package:novyse/ui/components/switch/segmented_switch.dart';
import 'package:novyse/core/themes/themes.dart';

String _toHex(Color c) =>
    (c.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0').toUpperCase();

Color? _parseHex(String input) {
  var t = input.trim();
  if (t.length == 3) t = t.split('').map((ch) => '$ch$ch').join();
  if (t.length != 6) return null;
  final v = int.tryParse(t, radix: 16);
  return v == null ? null : Color(0xFF000000 | v);
}

String _fmtPct(double pos) {
  final v = (pos * 1000).round() / 10;
  return v == v.roundToDouble() ? '${v.round()}%' : '${v.toStringAsFixed(1)}%';
}

class _UpperCaseFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) => newValue.copyWith(text: newValue.text.toUpperCase());
}

class _GradientStop {
  _GradientStop(this.position, this.color);
  double position;
  HSVColor color;
}

enum ColorPickerMode { color, gradient }

class ColorPicker extends StatefulWidget {
  const ColorPicker({
    super.key,
    this.mode = ColorPickerMode.color,
    this.allowModeSwitch = false,
    this.gradientColors = 2,
    this.initialColor = const Color(0xFF0F6FFF),
    this.initialGradientColors,
    this.initialGradientPositions,
    this.initialAngle = 90.0,
    this.showGradientAngle = false,
    this.gradientPreviewText,
    this.onColorChanged,
    this.onGradientChanged,
    this.onAngleChanged,
  }) : assert(gradientColors >= 2, 'gradient needs at least 2 colors');

  final ColorPickerMode mode;
  final bool allowModeSwitch;
  final int gradientColors;
  final Color initialColor;
  final List<Color>? initialGradientColors;
  final List<double>? initialGradientPositions;

  /// CSS degrees: 0 = up, 90 = right, clockwise.
  final double initialAngle;
  final bool showGradientAngle;
  final String? gradientPreviewText;
  final ValueChanged<Color>? onColorChanged;
  final ValueChanged<LinearGradient>? onGradientChanged;
  final ValueChanged<double>? onAngleChanged;

  @override
  State<ColorPicker> createState() => _ColorPickerState();
}

class _ColorPickerState extends State<ColorPicker> {
  late HSVColor _solid;

  late List<_GradientStop> _stops;
  late _GradientStop _selected;
  late double _angleDegrees;
  late bool _gradientMode;

  final TextEditingController _hexCtrl = TextEditingController();
  final FocusNode _hexFocus = FocusNode();

  // Locks sheet scroll while dragging the wheel / angle dial.
  bool _scrollLocked = false;

  @override
  void initState() {
    super.initState();
    _solid = HSVColor.fromColor(widget.initialColor);
    _angleDegrees = widget.initialAngle.clamp(0.0, 360.0);
    _gradientMode = widget.mode == ColorPickerMode.gradient;
    _stops = _buildInitialStops();
    _selected = _stops.first;
    _hexFocus.addListener(() {
      if (!_hexFocus.hasFocus) _syncHex();
    });
    _syncHex();
  }

  @override
  void didUpdateWidget(ColorPicker old) {
    super.didUpdateWidget(old);
    if (!widget.allowModeSwitch && old.mode != widget.mode) {
      _gradientMode = widget.mode == ColorPickerMode.gradient;
    }
    if (old.gradientColors != widget.gradientColors ||
        old.initialGradientColors != widget.initialGradientColors ||
        old.initialGradientPositions != widget.initialGradientPositions) {
      _stops = _buildInitialStops();
      _selected = _stops.first;
    }
    if (old.initialColor != widget.initialColor && !_gradientMode) {
      _solid = HSVColor.fromColor(widget.initialColor);
    }
    if (old.initialAngle != widget.initialAngle) {
      _angleDegrees = widget.initialAngle.clamp(0.0, 360.0);
    }
    _syncHex();
  }

  @override
  void dispose() {
    _hexCtrl.dispose();
    _hexFocus.dispose();
    super.dispose();
  }

  List<_GradientStop> _buildInitialStops() {
    final colors = widget.initialGradientColors;
    if (colors != null && colors.length >= 2) {
      final positions = widget.initialGradientPositions;
      return [
        for (var i = 0; i < colors.length; i++)
          _GradientStop(
            (positions != null && i < positions.length
                    ? positions[i]
                    : i / (colors.length - 1))
                .clamp(0.0, 1.0),
            HSVColor.fromColor(colors[i]),
          ),
      ];
    }
    return _defaultStops(widget.gradientColors);
  }

  List<_GradientStop> _defaultStops(int n) {
    n = math.max(2, n);
    if (n == 2) {
      return [
        _GradientStop(0.0, const HSVColor.fromAHSV(1, 215, 0.85, 0.65)),
        _GradientStop(1.0, const HSVColor.fromAHSV(1, 205, 0.50, 0.95)),
      ];
    }
    return List.generate(n, (i) {
      final t = i / (n - 1);
      return _GradientStop(
        t,
        HSVColor.fromAHSV(1, (215 + 300 * t) % 360, 0.8, 0.9),
      );
    });
  }

  void _setMode(ColorPickerMode next) {
    if (!widget.allowModeSwitch) return;
    final toGradient = next == ColorPickerMode.gradient;
    if (toGradient == _gradientMode) return;
    setState(() {
      if (toGradient) {
        if (_stops.length < 2) {
          _stops = [
            _GradientStop(0.0, _solid),
            _GradientStop(1.0, _solid.withHue((_solid.hue + 40) % 360)),
          ];
        } else {
          _stops.first.color = _solid;
        }
        _selected = _stops.first;
        _gradientMode = true;
      } else {
        _solid = _selected.color;
        _gradientMode = false;
      }
    });
    _syncHex();
    _notify();
  }

  HSVColor get _active => _gradientMode ? _selected.color : _solid;

  void _setActive(HSVColor c, {bool syncHex = true}) {
    setState(() {
      if (_gradientMode) {
        _selected.color = c;
      } else {
        _solid = c;
      }
    });
    if (syncHex) _syncHex();
    _notify();
  }

  void _syncHex() {
    final t = _toHex(_active.toColor());
    if (_hexCtrl.text != t) {
      _hexCtrl.value = TextEditingValue(
        text: t,
        selection: TextSelection.collapsed(offset: t.length),
      );
    }
  }

  void _onHexChanged(String text) {
    final c = _parseHex(text);
    if (c == null) return;
    var hsv = HSVColor.fromColor(c);
    final old = _active;
    // Greys/black have no hue — keep the previous one.
    if (hsv.saturation == 0 || hsv.value == 0) hsv = hsv.withHue(old.hue);
    if (hsv.value == 0) hsv = hsv.withSaturation(old.saturation);
    _setActive(hsv, syncHex: false);
  }

  void _setScrollLocked(bool v) {
    if (_scrollLocked != v) setState(() => _scrollLocked = v);
  }

  void _notify() {
    if (_gradientMode) {
      widget.onGradientChanged?.call(_buildGradient());
    } else {
      widget.onColorChanged?.call(_solid.toColor());
    }
  }

  List<_GradientStop> get _sortedStops =>
      [..._stops]..sort((a, b) => a.position.compareTo(b.position));

  LinearGradient _buildGradient() {
    final s = _sortedStops;
    // CSS angle → Flutter (y down): direction (sin, -cos).
    final rad = _angleDegrees * math.pi / 180;
    final dx = math.sin(rad);
    final dy = -math.cos(rad);
    return LinearGradient(
      colors: s.map((e) => e.color.toColor()).toList(),
      stops: s.map((e) => e.position).toList(),
      begin: Alignment(-dx, -dy),
      end: Alignment(dx, dy),
    );
  }

  void _setAngle(double value) {
    setState(() => _angleDegrees = value.clamp(0.0, 360.0));
    widget.onAngleChanged?.call(_angleDegrees);
    _notify();
  }

  HSVColor _colorAt(double t) {
    final s = _sortedStops;
    if (t <= s.first.position) return s.first.color;
    if (t >= s.last.position) return s.last.color;
    for (var i = 0; i < s.length - 1; i++) {
      final a = s[i], b = s[i + 1];
      if (t >= a.position && t <= b.position) {
        final span = b.position - a.position;
        final f = span == 0 ? 0.0 : (t - a.position) / span;
        return HSVColor.fromColor(
          Color.lerp(a.color.toColor(), b.color.toColor(), f)!,
        );
      }
    }
    return s.last.color;
  }

  void _selectStop(_GradientStop s) {
    setState(() => _selected = s);
    _syncHex();
  }

  void _moveStop(_GradientStop s, double pos) {
    setState(() => s.position = pos);
    _notify();
  }

  void _addStop(double pos) {
    final stop = _GradientStop(pos, _colorAt(pos));
    setState(() {
      _stops.add(stop);
      _selected = stop;
    });
    _syncHex();
    _notify();
  }

  void _addStopAtLargestGap() {
    final s = _sortedStops;
    var bestPos = 0.5;
    var bestGap = -1.0;
    for (var i = 0; i < s.length - 1; i++) {
      final gap = s[i + 1].position - s[i].position;
      if (gap > bestGap) {
        bestGap = gap;
        bestPos = (s[i].position + s[i + 1].position) / 2;
      }
    }
    _addStop(bestPos);
  }

  void _removeSelected() {
    if (_stops.length <= 2) return;
    setState(() {
      final idx = _stops.indexOf(_selected);
      _stops.remove(_selected);
      _selected = _stops[math.min(idx, _stops.length - 1)];
    });
    _syncHex();
    _notify();
  }

  @override
  Widget build(BuildContext context) {
    final active = _active;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = context.l10n;
    final selectedIndex = _sortedStops.indexOf(_selected) + 1;

    return SingleChildScrollView(
      physics: _scrollLocked ? const NeverScrollableScrollPhysics() : null,
      padding: const EdgeInsets.all(20),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 380),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (widget.allowModeSwitch) ...[
                SegmentedSwitch<ColorPickerMode>(
                  value: _gradientMode
                      ? ColorPickerMode.gradient
                      : ColorPickerMode.color,
                  segmentMinWidth: 110,
                  options: [
                    SegmentedOption(
                      value: ColorPickerMode.color,
                      label: l10n.colorPickerModeColor,
                    ),
                    SegmentedOption(
                      value: ColorPickerMode.gradient,
                      label: l10n.colorPickerModeGradient,
                    ),
                  ],
                  onChanged: _setMode,
                ),
                const SizedBox(height: 20),
              ],

              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 320),
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: ColorWheel(
                      color: active,
                      onChanged: _setActive,
                      onDragging: _setScrollLocked,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              if (!_gradientMode)
                Container(
                  height: 72,
                  decoration: BoxDecoration(
                    color: active.toColor(),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: scheme.outlineVariant),
                  ),
                )
              else ...[
                _GradientEditor(
                  stops: _stops,
                  selected: _selected,
                  onSelect: _selectStop,
                  onMove: _moveStop,
                  onAdd: _addStop,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${l10n.colorPickerStopLabel(selectedIndex, _stops.length)}'
                        ' · ${_fmtPct(_selected.position)}',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                    Text(
                      l10n.colorPickerColors,
                      style: theme.textTheme.bodyMedium,
                    ),
                    const SizedBox(width: 4),
                    IconButton.outlined(
                      visualDensity: VisualDensity.compact,
                      tooltip: l10n.colorPickerRemoveColor,
                      onPressed: _stops.length > 2 ? _removeSelected : null,
                      icon: const AppHugeIcon(
                        icon: HugeIcons.strokeRoundedMinusSign,
                      ),
                    ),
                    SizedBox(
                      width: 30,
                      child: Text(
                        '${_stops.length}',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleMedium,
                      ),
                    ),
                    IconButton.outlined(
                      visualDensity: VisualDensity.compact,
                      tooltip: l10n.colorPickerAddColor,
                      onPressed: _addStopAtLargestGap,
                      icon: const AppHugeIcon(
                        icon: HugeIcons.strokeRoundedPlus,
                      ),
                    ),
                  ],
                ),
                if (widget.showGradientAngle) ...[
                  const SizedBox(height: 16),
                  _GradientAngleControl(
                    angleDegrees: _angleDegrees,
                    gradient: _buildGradient(),
                    onChanged: _setAngle,
                    onDragging: _setScrollLocked,
                  ),
                ],
                if (widget.gradientPreviewText != null) ...[
                  const SizedBox(height: 12),
                  ShaderMask(
                    shaderCallback: (bounds) => _buildGradient().createShader(
                      Rect.fromLTWH(0, 0, bounds.width, bounds.height),
                    ),
                    child: Text(
                      widget.gradientPreviewText!,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.white, // required by ShaderMask
                      ),
                    ),
                  ),
                ],
              ],
              const SizedBox(height: 20),

              OnboardingTextField(
                label: l10n.colorPickerHexLabel,
                hint: l10n.colorPickerHexHint,
                controller: _hexCtrl,
                focusNode: _hexFocus,
                maxLength: 6,
                autocorrect: false,
                enableSuggestions: false,
                textCapitalization: TextCapitalization.characters,
                keyboardType: TextInputType.visiblePassword,
                textInputAction: TextInputAction.done,
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp('[0-9a-fA-F]')),
                  _UpperCaseFormatter(),
                ],
                prefixIcon: Padding(
                  padding: const EdgeInsets.only(left: 16, right: 4),
                  child: Align(
                    widthFactor: 1,
                    alignment: Alignment.center,
                    child: Text(
                      '#',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                onChanged: _onHexChanged,
                onFieldSubmitted: (_) => _syncHex(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GradientAngleControl extends StatelessWidget {
  const _GradientAngleControl({
    required this.angleDegrees,
    required this.gradient,
    required this.onChanged,
    this.onDragging,
  });

  final double angleDegrees;
  final LinearGradient gradient;
  final ValueChanged<double> onChanged;
  final ValueChanged<bool>? onDragging;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = context.l10n;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        _GradientAngleDial(
          angleDegrees: angleDegrees,
          gradient: gradient,
          onChanged: onChanged,
          onDragging: onDragging,
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      l10n.colorPickerAngle,
                      style: theme.textTheme.bodyMedium,
                    ),
                  ),
                  Text(
                    '${angleDegrees.round()}°',
                    style: theme.textTheme.titleMedium,
                  ),
                ],
              ),
              Slider(
                value: angleDegrees,
                min: 0,
                max: 360,
                divisions: 360,
                label: '${angleDegrees.round()}°',
                onChanged: onChanged,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _GradientAngleDial extends StatefulWidget {
  const _GradientAngleDial({
    required this.angleDegrees,
    required this.gradient,
    required this.onChanged,
    this.onDragging,
  });

  final double angleDegrees;
  final LinearGradient gradient;
  final ValueChanged<double> onChanged;
  final ValueChanged<bool>? onDragging;

  @override
  State<_GradientAngleDial> createState() => _GradientAngleDialState();
}

class _GradientAngleDialState extends State<_GradientAngleDial> {
  static const double _size = 88;

  void _updateFromLocal(Offset local) {
    const center = Offset(_size / 2, _size / 2);
    final dx = local.dx - center.dx;
    final dy = local.dy - center.dy;
    if (dx == 0 && dy == 0) return;
    // Screen atan2 → CSS degrees (0 = up, clockwise).
    var deg = math.atan2(dx, -dy) * 180 / math.pi;
    if (deg < 0) deg += 360;
    widget.onChanged(deg);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      width: _size,
      height: _size,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        dragStartBehavior: DragStartBehavior.down,
        onPanStart: (d) {
          widget.onDragging?.call(true);
          _updateFromLocal(d.localPosition);
        },
        onPanUpdate: (d) => _updateFromLocal(d.localPosition),
        onPanEnd: (_) => widget.onDragging?.call(false),
        onPanCancel: () => widget.onDragging?.call(false),
        child: CustomPaint(
          painter: _AngleDialPainter(
            angleDegrees: widget.angleDegrees,
            gradient: widget.gradient,
            outline: scheme.outlineVariant,
            arrow: scheme.onSurface,
          ),
        ),
      ),
    );
  }
}

class _AngleDialPainter extends CustomPainter {
  _AngleDialPainter({
    required this.angleDegrees,
    required this.gradient,
    required this.outline,
    required this.arrow,
  });

  final double angleDegrees;
  final LinearGradient gradient;
  final Color outline;
  final Color arrow;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.shortestSide / 2;

    final rect = Rect.fromCircle(center: center, radius: radius);
    canvas.drawCircle(
      center,
      radius,
      Paint()..shader = gradient.createShader(rect),
    );
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..color = outline,
    );

    final rad = angleDegrees * math.pi / 180;
    final dir = Offset(math.sin(rad), -math.cos(rad));
    final tip = center + dir * (radius * 0.78);
    final tail = center - dir * (radius * 0.28);

    final line = Paint()
      ..color = arrow
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(tail, tip, line);

    final ortho = Offset(-dir.dy, dir.dx);
    final headBase = tip - dir * 10;
    final head = Path()
      ..moveTo(tip.dx, tip.dy)
      ..lineTo(headBase.dx + ortho.dx * 6, headBase.dy + ortho.dy * 6)
      ..lineTo(headBase.dx - ortho.dx * 6, headBase.dy - ortho.dy * 6)
      ..close();
    canvas.drawPath(head, Paint()..color = arrow);

    canvas.drawCircle(center, 4, Paint()..color = arrow);
    canvas.drawCircle(
      center,
      4,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5
        ..color = Colors.white,
    );
  }

  @override
  bool shouldRepaint(_AngleDialPainter old) =>
      old.angleDegrees != angleDegrees ||
      old.gradient != gradient ||
      old.outline != outline ||
      old.arrow != arrow;
}

enum _Zone { ring, square }

class _WheelGeometry {
  _WheelGeometry(Size size)
    : center = size.center(Offset.zero),
      outerR = size.shortestSide / 2;

  final Offset center;
  final double outerR;

  double get ringW => outerR * 0.17;
  double get innerR => outerR - ringW;
  Rect get square => Rect.fromCenter(
    center: center,
    width: innerR * 1.28,
    height: innerR * 1.28,
  );
}

class ColorWheel extends StatefulWidget {
  const ColorWheel({
    super.key,
    required this.color,
    required this.onChanged,
    this.onDragging,
  });

  final HSVColor color;
  final ValueChanged<HSVColor> onChanged;
  final ValueChanged<bool>? onDragging;

  @override
  State<ColorWheel> createState() => _ColorWheelState();
}

class _ColorWheelState extends State<ColorWheel> {
  _Zone? _zone;

  void _handle(Offset p, Size size, {bool start = false}) {
    final g = _WheelGeometry(size);

    if (start) {
      final d = (p - g.center).distance;
      if (d >= g.innerR - 4 && d <= g.outerR + 4) {
        _zone = _Zone.ring;
      } else if (g.square.inflate(10).contains(p)) {
        _zone = _Zone.square;
      } else {
        _zone = null;
      }
      widget.onDragging?.call(_zone != null);
    }

    switch (_zone) {
      case _Zone.ring:
        var deg =
            math.atan2(p.dy - g.center.dy, p.dx - g.center.dx) * 180 / math.pi;
        if (deg < 0) deg += 360;
        widget.onChanged(widget.color.withHue(deg));
      case _Zone.square:
        final r = g.square;
        final s = ((p.dx - r.left) / r.width).clamp(0.0, 1.0);
        final v = 1 - ((p.dy - r.top) / r.height).clamp(0.0, 1.0);
        widget.onChanged(HSVColor.fromAHSV(1, widget.color.hue, s, v));
      case null:
        break;
    }
  }

  void _end() {
    if (_zone != null) widget.onDragging?.call(false);
    _zone = null;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final size = Size.square(c.biggest.shortestSide);
        // DragStartBehavior.down wins the gesture arena on touch so the
        // sheet does not scroll while dragging. Both axes do the same work.
        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          dragStartBehavior: DragStartBehavior.down,
          onHorizontalDragStart: (d) =>
              _handle(d.localPosition, size, start: true),
          onHorizontalDragUpdate: (d) => _handle(d.localPosition, size),
          onHorizontalDragEnd: (_) => _end(),
          onHorizontalDragCancel: _end,
          onVerticalDragStart: (d) =>
              _handle(d.localPosition, size, start: true),
          onVerticalDragUpdate: (d) => _handle(d.localPosition, size),
          onVerticalDragEnd: (_) => _end(),
          onVerticalDragCancel: _end,
          child: CustomPaint(size: size, painter: _WheelPainter(widget.color)),
        );
      },
    );
  }
}

class _WheelPainter extends CustomPainter {
  _WheelPainter(this.color);
  final HSVColor color;

  static const _hueColors = [
    Color(0xFFFF0000),
    Color(0xFFFFFF00),
    Color(0xFF00FF00),
    Color(0xFF00FFFF),
    Color(0xFF0000FF),
    Color(0xFFFF00FF),
    Color(0xFFFF0000),
  ];

  void _thumb(Canvas canvas, Offset o, double r, Color fill) {
    canvas.drawCircle(o, r, Paint()..color = fill);
    canvas.drawCircle(
      o,
      r,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..color = Colors.white,
    );
    final outline = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = Colors.black38;
    canvas.drawCircle(o, r + 1.5, outline);
    canvas.drawCircle(o, r - 1.5, outline);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final g = _WheelGeometry(size);
    final pureHue = HSVColor.fromAHSV(1, color.hue, 1, 1).toColor();

    canvas.drawCircle(
      g.center,
      g.outerR - g.ringW / 2,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = g.ringW
        ..shader = const SweepGradient(colors: _hueColors)
            .createShader(Rect.fromCircle(center: g.center, radius: g.outerR)),
    );

    final rect = g.square;
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(6));
    canvas.drawRRect(
      rrect,
      Paint()
        ..shader = LinearGradient(colors: [Colors.white, pureHue])
            .createShader(rect),
    );
    canvas.drawRRect(
      rrect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Colors.transparent, Colors.black],
        ).createShader(rect),
    );

    final ang = color.hue * math.pi / 180;
    final ringR = g.outerR - g.ringW / 2;
    _thumb(
      canvas,
      Offset(
        g.center.dx + ringR * math.cos(ang),
        g.center.dy + ringR * math.sin(ang),
      ),
      g.ringW / 2 - 2,
      pureHue,
    );

    _thumb(
      canvas,
      Offset(
        rect.left + color.saturation * rect.width,
        rect.top + (1 - color.value) * rect.height,
      ),
      10,
      color.toColor(),
    );
  }

  @override
  bool shouldRepaint(_WheelPainter old) => old.color != color;
}

// Gradient bar: markers are paint-only (IgnorePointer). One GestureDetector
// on the lane grabs the nearest stop within [_grabRadius] — per-marker
// hitboxes used to overlap and drag the wrong stop ("teleport").

class _GradientEditor extends StatefulWidget {
  const _GradientEditor({
    required this.stops,
    required this.selected,
    required this.onSelect,
    required this.onMove,
    required this.onAdd,
  });

  final List<_GradientStop> stops;
  final _GradientStop selected;
  final ValueChanged<_GradientStop> onSelect;
  final void Function(_GradientStop stop, double position) onMove;
  final ValueChanged<double> onAdd;

  @override
  State<_GradientEditor> createState() => _GradientEditorState();
}

class _GradientEditorState extends State<_GradientEditor> {
  static const double _barH = 56;
  static const double _markerW = 22;
  static const double _markerH = 30;

  static const double _grabRadius = 32;

  _GradientStop? _dragging;
  double _dragStartX = 0;
  double _dragStartPos = 0;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return LayoutBuilder(
      builder: (context, c) {
        const pad = _grabRadius;
        final barW = c.maxWidth - pad * 2;

        final sorted = [...widget.stops]
          ..sort((a, b) => a.position.compareTo(b.position));
        final gradient = LinearGradient(
          colors: sorted.map((s) => s.color.toColor()).toList(),
          stops: sorted.map((s) => s.position).toList(),
        );

        final ordered = [
          ...widget.stops.where((s) => s != widget.selected),
          widget.selected,
        ];

        _GradientStop? nearestStop(double dx) {
          _GradientStop? best;
          var bestDist = _grabRadius;
          for (final s in widget.stops) {
            final dist = (s.position * barW - dx).abs();
            if (dist <= bestDist) {
              bestDist = dist;
              best = s;
            }
          }
          return best;
        }

        return SizedBox(
          height: _barH + _markerH + 4,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Positioned(
                left: pad,
                right: pad,
                top: 0,
                height: _barH,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTapUp: (d) =>
                      widget.onAdd((d.localPosition.dx / barW).clamp(0.0, 1.0)),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: gradient,
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      border: Border.all(color: scheme.outlineVariant),
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                top: _barH + 2,
                height: _markerH + 2,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTapUp: (d) {
                    final s = nearestStop(d.localPosition.dx - pad);
                    if (s != null) widget.onSelect(s);
                  },
                  onHorizontalDragStart: (d) {
                    final s = nearestStop(d.localPosition.dx - pad);
                    if (s == null) {
                      _dragging = null;
                      return;
                    }
                    _dragging = s;
                    widget.onSelect(s);
                    _dragStartX = d.localPosition.dx;
                    _dragStartPos = s.position;
                  },
                  onHorizontalDragUpdate: (d) {
                    final target = _dragging;
                    if (target == null) return;
                    final p =
                        _dragStartPos +
                        (d.localPosition.dx - _dragStartX) / barW;
                    widget.onMove(target, p.clamp(0.0, 1.0));
                  },
                  onHorizontalDragEnd: (_) => _dragging = null,
                  onHorizontalDragCancel: () => _dragging = null,
                ),
              ),
              for (final s in ordered)
                Positioned(
                  left: pad + s.position * barW - _markerW / 2,
                  top: _barH + 2,
                  width: _markerW,
                  height: _markerH,
                  child: IgnorePointer(
                    child: CustomPaint(
                      painter: _MarkerPainter(
                        color: s.color.toColor(),
                        selected: s == widget.selected,
                        scheme: scheme,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _MarkerPainter extends CustomPainter {
  _MarkerPainter({
    required this.color,
    required this.selected,
    required this.scheme,
  });
  final Color color;
  final bool selected;
  final ColorScheme scheme;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, h = size.height;
    const tip = 8.0;

    final body = Path()
      ..moveTo(w / 2, 0)
      ..lineTo(w, tip)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..lineTo(0, tip)
      ..close();

    canvas.drawPath(body, Paint()..color = scheme.surfaceContainerHighest);
    canvas.drawPath(
      body,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2
        ..color = scheme.outline,
    );

    if (selected) {
      final top = Path()
        ..moveTo(w / 2, 0)
        ..lineTo(w, tip)
        ..lineTo(0, tip)
        ..close();
      canvas.drawPath(top, Paint()..color = scheme.primary);
    }

    final inner = Rect.fromLTRB(4, tip + 3, w - 4, h - 4);
    canvas.drawRect(inner, Paint()..color = color);
    canvas.drawRect(
      inner,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = scheme.outline,
    );
  }

  @override
  bool shouldRepaint(_MarkerPainter old) =>
      old.color != color || old.selected != selected || old.scheme != scheme;
}
