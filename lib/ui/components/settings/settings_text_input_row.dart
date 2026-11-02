import 'package:flutter/material.dart';

/// Inline text input row for settings pages: a [title] label with a text
/// field underneath (e.g. first name, surname, phone, biography).
///
/// Unlike the catalog `textInput` component — which opens an editor sheet —
/// this row edits inline, so it fits profile fields that are always visible.
///
/// Pass [minLines] > 1 (e.g. 4 for a biography) to get a taller, multi-line
/// field; with the default `minLines: 1` it stays a single-line row.
/// No API call is made here: the parent owns persistence and just observes
/// [onChanged] (or reads [controller]).
class SettingsTextInputRow extends StatefulWidget {
  const SettingsTextInputRow({
    super.key,
    required this.title,
    this.controller,
    this.initialValue,
    this.hintText,
    this.onChanged,
    this.minLines = 1,
    this.maxLines,
    this.keyboardType,
    this.textCapitalization = TextCapitalization.sentences,
    this.textInputAction,
    this.enabled = true,
    this.autofocus = false,
  }) : assert(minLines >= 1, 'minLines must be at least 1');

  /// Label shown above the field.
  final String title;

  /// External controller. When null, the row owns one seeded with
  /// [initialValue] (kept in sync while the user hasn't typed yet, so late
  /// store loads still fill the field without clobbering edits).
  final TextEditingController? controller;

  /// Default text, used only when [controller] is null.
  final String? initialValue;

  /// Placeholder shown when the field is empty.
  final String? hintText;

  final ValueChanged<String>? onChanged;

  /// Visible lines. Values > 1 render a taller multi-line field.
  final int minLines;

  /// Defaults to [minLines] when [minLines] > 1, otherwise 1.
  final int? maxLines;

  final TextInputType? keyboardType;
  final TextCapitalization textCapitalization;
  final TextInputAction? textInputAction;
  final bool enabled;
  final bool autofocus;

  @override
  State<SettingsTextInputRow> createState() => _SettingsTextInputRowState();
}

class _SettingsTextInputRowState extends State<SettingsTextInputRow> {
  TextEditingController? _ownedController;

  /// Set once the user types, so late [initialValue] updates never
  /// overwrite an in-progress edit.
  bool _dirty = false;

  TextEditingController get _effectiveController =>
      widget.controller ?? _ownedController!;

  int get _resolvedMaxLines {
    final max = widget.maxLines;
    if (max != null) return max;
    return widget.minLines > 1 ? widget.minLines : 1;
  }

  @override
  void initState() {
    super.initState();
    if (widget.controller == null) {
      _ownedController = TextEditingController(text: widget.initialValue ?? '');
    }
  }

  @override
  void didUpdateWidget(covariant SettingsTextInputRow oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      if (oldWidget.controller == null) {
        _ownedController?.dispose();
        _ownedController = null;
      }
      if (widget.controller == null) {
        _ownedController = TextEditingController(
          text: widget.initialValue ?? '',
        );
        _dirty = false;
      }
    } else if (widget.controller == null &&
        !_dirty &&
        widget.initialValue != oldWidget.initialValue &&
        widget.initialValue != _ownedController!.text) {
      _ownedController!.text = widget.initialValue ?? '';
    }
  }

  @override
  void dispose() {
    _ownedController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final multiline = widget.minLines > 1 || _resolvedMaxLines > 1;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          widget.title,
          style: TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 15,
            color: colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _effectiveController,
          decoration: InputDecoration(
            hintText: widget.hintText,
            hintStyle: TextStyle(color: colorScheme.onSurfaceVariant),
            border: InputBorder.none,
            contentPadding: EdgeInsets.zero,
            isDense: true,
            isCollapsed: true,
            filled: false,
            fillColor: Colors.transparent,
            hoverColor: Colors.transparent,
          ),
          style: TextStyle(color: colorScheme.onSurface),
          onChanged: (value) {
            _dirty = true;
            widget.onChanged?.call(value);
          },
          minLines: widget.minLines,
          maxLines: _resolvedMaxLines,
          keyboardType:
              widget.keyboardType ??
              (multiline ? TextInputType.multiline : null),
          textCapitalization: widget.textCapitalization,
          textInputAction:
              widget.textInputAction ??
              (multiline ? TextInputAction.newline : TextInputAction.next),
          enabled: widget.enabled,
          autofocus: widget.autofocus,
        ),
      ],
    );
  }
}
