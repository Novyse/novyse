import 'dart:math' as math;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hugeicons/hugeicons.dart';

import 'package:novyse/ui/components/huge_icon.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/// Colore -> "RRGGBB" maiuscolo, senza '#'.
String _toHex(Color c) =>
    (c.toARGB32() & 0xFFFFFF).toRadixString(16).padLeft(6, '0').toUpperCase();

/// "RRGGBB" o "RGB" -> Color, null se non valido.
Color? _parseHex(String input) {
  var t = input.trim();
  if (t.length == 3) t = t.split('').map((ch) => '$ch$ch').join();
  if (t.length != 6) return null;
  final v = int.tryParse(t, radix: 16);
  return v == null ? null : Color(0xFF000000 | v);
}

/// 0.5 -> "50%", 0.333 -> "33.3%"
String _fmtPct(double pos) {
  final v = (pos * 1000).round() / 10;
  return v == v.roundToDouble() ? '${v.round()}%' : '${v.toStringAsFixed(1)}%';
}

class _UpperCaseFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
          TextEditingValue oldValue, TextEditingValue newValue) =>
      newValue.copyWith(text: newValue.text.toUpperCase());
}

/// Uno stop del gradiente: posizione 0..1 + colore (HSV, così non perdiamo
/// la tonalità quando saturazione/luminosità vanno a zero).
class _GradientStop {
  _GradientStop(this.position, this.color);
  double position;
  HSVColor color;
}

// ─────────────────────────────────────────────────────────────────────────────
// NovyseColorPicker (riutilizzabile, in stile Novyse)
// ─────────────────────────────────────────────────────────────────────────────

enum NovyseColorPickerMode {
  /// Solo colore singolo.
  color,

  /// Solo gradient con [NovyseColorPicker.gradientColors] stop iniziali.
  gradient,
}

class NovyseColorPicker extends StatefulWidget {
  const NovyseColorPicker({
    super.key,
    this.mode = NovyseColorPickerMode.color,
    this.gradientColors = 2,
    this.initialColor = const Color(0xFF0F6FFF),
    this.initialAngle = 90.0,
    this.showGradientAngle = false,
    this.gradientPreviewText,
    this.onColorChanged,
    this.onGradientChanged,
    this.onAngleChanged,
  }) : assert(gradientColors >= 2, 'Un gradient ha almeno 2 colori');

  final NovyseColorPickerMode mode;

  /// Numero di colori iniziali del gradient (>= 2).
  final int gradientColors;

  /// Colore iniziale in modalità tinta unita (blu Novyse di default).
  final Color initialColor;

  /// Angolo iniziale del gradient in gradi, convenzione CSS
  /// (0 = verso l'alto, 90 = verso destra, 180 = verso il basso,
  /// 270 = verso sinistra). Default 90 = orizzontale verso destra.
  final double initialAngle;

  /// Se true, in modalità gradient mostra lo slider 0-360° per la direzione.
  final bool showGradientAngle;

  /// Se non null, in modalità gradient mostra questo testo di esempio con
  /// il gradient applicato sopra (live preview). Null = nascosto.
  final String? gradientPreviewText;

  final ValueChanged<Color>? onColorChanged;
  final ValueChanged<LinearGradient>? onGradientChanged;
  final ValueChanged<double>? onAngleChanged;

  @override
  State<NovyseColorPicker> createState() => _NovyseColorPickerState();
}

class _NovyseColorPickerState extends State<NovyseColorPicker> {
  late HSVColor _solid;

  late List<_GradientStop> _stops;
  late _GradientStop _selected;

  /// Angolo del gradient in gradi, convenzione CSS
  /// (0 = alto, 90 = destra, 180 = basso, 270 = sinistra).
  late double _angleDegrees;

  final TextEditingController _hexCtrl = TextEditingController();
  final FocusNode _hexFocus = FocusNode();

  /// La modalità è decisa dal chiamante via [NovyseColorPicker.mode]:
  /// niente switch interno, si mostra o il colore singolo o il gradient.
  bool get _gradientMode => widget.mode == NovyseColorPickerMode.gradient;

  // Blocca lo scroll del foglio mentre trascini la wheel.
  bool _scrollLocked = false;

  @override
  void initState() {
    super.initState();
    _solid = HSVColor.fromColor(widget.initialColor);
    _angleDegrees = widget.initialAngle.clamp(0.0, 360.0);
    _stops = _initialStops(widget.gradientColors);
    _selected = _stops.first;
    _hexFocus.addListener(() {
      if (!_hexFocus.hasFocus) _syncHex();
    });
    _syncHex();
  }

  @override
  void didUpdateWidget(NovyseColorPicker old) {
    super.didUpdateWidget(old);
    if (old.gradientColors != widget.gradientColors) {
      _stops = _initialStops(widget.gradientColors);
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

  List<_GradientStop> _initialStops(int n) {
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
          t, HSVColor.fromAHSV(1, (215 + 300 * t) % 360, 0.8, 0.9));
    });
  }

  // Colore attualmente "sotto modifica": quello solido o lo stop selezionato.
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
    // Grigi e nero: la tonalità non è definita, teniamo quella di prima.
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

  // ── Gradient ──────────────────────────────────────────────────────────────

  List<_GradientStop> get _sortedStops =>
      [..._stops]..sort((a, b) => a.position.compareTo(b.position));

  LinearGradient _buildGradient() {
    final s = _sortedStops;
    // Stessa convenzione del CSS: 0° = verso l'alto, angoli in senso orario.
    // In coordinate Flutter (y verso il basso) la direzione è
    // (sin, -cos): 0° -> alto, 90° -> destra, 180° -> basso, 270° -> sinistra.
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

  /// Testo leggibile + riga CSS, è quello mostrato (e copiato) dal campo risultato.
  String _gradientText() {
    final s = _sortedStops;
    final b = StringBuffer('Gradient lineare · ${s.length} colori\n');
    for (var i = 0; i < s.length; i++) {
      b.writeln(
          '${i + 1}) #${_toHex(s[i].color.toColor())} — ${_fmtPct(s[i].position)}');
    }
    final css = s
        .map((e) => '#${_toHex(e.color.toColor())} ${_fmtPct(e.position)}')
        .join(', ');
    // Slider e CSS parlano la stessa lingua: il valore dello slider
    // È già l'angolo CSS (0° = verso l'alto, 90° = verso destra).
    final cssDeg = _angleDegrees % 360;
    final cssDegText = cssDeg == cssDeg.roundToDouble()
        ? '${cssDeg.round()}°'
        : '${cssDeg.toStringAsFixed(1)}°';
    b.write('CSS: linear-gradient($cssDegText, $css)');
    return b.toString();
  }

  Future<void> _copyResult() async {
    await Clipboard.setData(ClipboardData(text: _gradientText()));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Copiato negli appunti'),
        duration: Duration(seconds: 2),
      ),
    );
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
            Color.lerp(a.color.toColor(), b.color.toColor(), f)!);
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

  /// Bottone "+": aggiunge un colore a metà del buco più largo.
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

  // ── UI ────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final active = _active;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return SingleChildScrollView(
      physics: _scrollLocked ? const NeverScrollableScrollPhysics() : null,
      padding: const EdgeInsets.all(20),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 380),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Wheel + quadrato S/V
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 320),
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: NovyseColorWheel(
                      color: active,
                      onChanged: _setActive,
                      onDragging: _setScrollLocked,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Preview live
              if (!_gradientMode)
                Container(
                  height: 72,
                  decoration: BoxDecoration(
                    color: active.toColor(),
                    borderRadius: BorderRadius.circular(12),
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
                        'Colore ${_sortedStops.indexOf(_selected) + 1} di '
                        '${_stops.length} · ${_fmtPct(_selected.position)}',
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                    Text('Colori', style: theme.textTheme.bodyMedium),
                    const SizedBox(width: 4),
                    IconButton.outlined(
                      visualDensity: VisualDensity.compact,
                      tooltip: 'Rimuovi il colore selezionato',
                      onPressed: _stops.length > 2 ? _removeSelected : null,
                      icon: const AppHugeIcon(
                          icon: HugeIcons.strokeRoundedMinusSign),
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
                      tooltip: 'Aggiungi un colore',
                      onPressed: _addStopAtLargestGap,
                      icon: const AppHugeIcon(icon: HugeIcons.strokeRoundedPlus),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Minimo 2 colori. Tocca la barra per aggiungerne uno, '
                  'trascina i marker per spostarli.',
                  style: theme.textTheme.bodySmall
                      ?.copyWith(color: scheme.onSurfaceVariant),
                ),
                // Slider direzione 0-360° (solo se richiesto via proprietà).
                if (widget.showGradientAngle) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Angolo',
                          style: theme.textTheme.bodyMedium,
                        ),
                      ),
                      Text(
                        '${_angleDegrees.round()}°',
                        style: theme.textTheme.titleMedium,
                      ),
                    ],
                  ),
                  Slider(
                    value: _angleDegrees,
                    min: 0,
                    max: 360,
                    divisions: 360,
                    label: '${_angleDegrees.round()}°',
                    onChanged: _setAngle,
                  ),
                ],
                // Testo di esempio con il gradient applicato (solo se
                // richiesto via proprietà). Live: segue colori e angolo.
                if (widget.gradientPreviewText != null) ...[
                  const SizedBox(height: 12),
                  ShaderMask(
                    shaderCallback: (bounds) =>
                        _buildGradient().createShader(
                      Rect.fromLTWH(0, 0, bounds.width, bounds.height),
                    ),
                    child: Text(
                      widget.gradientPreviewText!,
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.white, // necessario per lo ShaderMask
                      ),
                    ),
                  ),
                ],
              ],
              const SizedBox(height: 20),

              // Hex (del colore singolo o dello stop selezionato)
              TextField(
                controller: _hexCtrl,
                focusNode: _hexFocus,
                maxLength: 6,
                autocorrect: false,
                enableSuggestions: false,
                textCapitalization: TextCapitalization.characters,
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp('[0-9a-fA-F]')),
                  _UpperCaseFormatter(),
                ],
                decoration: const InputDecoration(
                  labelText: 'HEX',
                  prefixText: '#',
                  counterText: '',
                  border: OutlineInputBorder(),
                ),
                onChanged: _onHexChanged,
                onSubmitted: (_) => _syncHex(),
              ),

              // Risultato del gradient: sola lettura + copia
              if (_gradientMode) ...[
                const SizedBox(height: 16),
                InputDecorator(
                  decoration: InputDecoration(
                    labelText: 'Risultato gradient',
                    border: const OutlineInputBorder(),
                    suffixIcon: IconButton(
                      tooltip: 'Copia',
                      icon: const AppHugeIcon(
                          icon: HugeIcons.strokeRoundedCopy01),
                      onPressed: _copyResult,
                    ),
                  ),
                  child: SelectableText(
                    _gradientText(),
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Color wheel + quadrato saturazione/luminosità
// ─────────────────────────────────────────────────────────────────────────────

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
      center: center, width: innerR * 1.28, height: innerR * 1.28);
}

class NovyseColorWheel extends StatefulWidget {
  const NovyseColorWheel({
    super.key,
    required this.color,
    required this.onChanged,
    this.onDragging,
  });

  final HSVColor color;
  final ValueChanged<HSVColor> onChanged;
  final ValueChanged<bool>? onDragging;

  @override
  State<NovyseColorWheel> createState() => _NovyseColorWheelState();
}

class _NovyseColorWheelState extends State<NovyseColorWheel> {
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
    return LayoutBuilder(builder: (context, c) {
      final size = Size.square(c.biggest.shortestSide);
      // Claim immediato: con DragStartBehavior.down questo detector vince
      // l'arena dei gesture AL TOCCO, prima che la scroll view del foglio
      // (o il drag-to-dismiss del bottom sheet) possa partire. Così
      // trascinare il pallino non scrolla più la pagina. I due assi fanno
      // la stessa cosa: basta che uno dei due vinca, la posizione del
      // dito è comunque 2D.
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
    });
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
          ..color = Colors.white);
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

    // Anello delle tonalità
    canvas.drawCircle(
      g.center,
      g.outerR - g.ringW / 2,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = g.ringW
        ..shader = const SweepGradient(colors: _hueColors)
            .createShader(Rect.fromCircle(center: g.center, radius: g.outerR)),
    );

    // Quadrato: bianco -> colore (orizzontale), trasparente -> nero (verticale)
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

    // Thumb tonalità
    final ang = color.hue * math.pi / 180;
    final ringR = g.outerR - g.ringW / 2;
    _thumb(
      canvas,
      Offset(g.center.dx + ringR * math.cos(ang),
          g.center.dy + ringR * math.sin(ang)),
      g.ringW / 2 - 2,
      pureHue,
    );

    // Thumb saturazione/luminosità
    _thumb(
      canvas,
      Offset(rect.left + color.saturation * rect.width,
          rect.top + (1 - color.value) * rect.height),
      10,
      color.toColor(),
    );
  }

  @override
  bool shouldRepaint(_WheelPainter old) => old.color != color;
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor gradient: barra + marker trascinabili
//
// FIX teletrasporto: i marker sono solo grafica (IgnorePointer). UN SOLO
// GestureDetector copre tutta la corsia dei marker: al tocco aggancia lo
// stop più vicino entro il raggio di presa, lo seleziona e muove SOLO
// quello. Prima invece ogni marker aveva un suo detector con area di tocco
// larga 36px: con stop vicini le aree si sovrapponevano, il marker
// selezionato (disegnato sopra) vinceva l'arena dei gesture anche premendo
// sull'altro, e lo stop vecchio veniva trascinato al dito ("teletrasporto").
// Ora è strutturalmente impossibile muovere lo stop sbagliato.
// ─────────────────────────────────────────────────────────────────────────────

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

  /// Raggio di presa in px: oltre questa distanza dal marker più vicino
  /// il tocco sulla corsia viene ignorato.
  static const double _grabRadius = 32;

  _GradientStop? _dragging;
  double _dragStartX = 0;
  double _dragStartPos = 0;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return LayoutBuilder(builder: (context, c) {
      const pad = _grabRadius;
      final barW = c.maxWidth - pad * 2;

      final sorted = [...widget.stops]
        ..sort((a, b) => a.position.compareTo(b.position));
      final gradient = LinearGradient(
        colors: sorted.map((s) => s.color.toColor()).toList(),
        stops: sorted.map((s) => s.position).toList(),
      );

      // Lo stop selezionato va in cima (ultimo = sopra).
      final ordered = [
        ...widget.stops.where((s) => s != widget.selected),
        widget.selected,
      ];

      /// Stop più vicino a [dx] (px dalla sinistra della barra), null se
      /// troppo lontano.
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
            // Barra: tocco = aggiungi stop.
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
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: scheme.outlineVariant),
                  ),
                ),
              ),
            ),
            // Corsia marker: UN SOLO detector. Al tocco trascina lo stop
            // più vicino; gli altri non si muovono mai.
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
                  final p = _dragStartPos +
                      (d.localPosition.dx - _dragStartX) / barW;
                  widget.onMove(target, p.clamp(0.0, 1.0));
                },
                onHorizontalDragEnd: (_) => _dragging = null,
                onHorizontalDragCancel: () => _dragging = null,
              ),
            ),
            // Marker: solo grafica, nessun gesture (vedi FIX sopra).
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
    });
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
      old.color != color ||
      old.selected != selected ||
      old.scheme != scheme;
}
