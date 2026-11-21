import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:material_ui/material_ui.dart';

/// The Markdown sheet of the application.
///
/// A chat message, a plugin README and a legal document render through the
/// same component, so the colours and the metrics of a link, a code block or a
/// table live here and not in the screens that use them.
MarkdownStyleSheet appMarkdownStyleSheet(
  BuildContext context, {
  Color? textColor,
  Color? background,
  Color? linkColor,
  double fontSize = 15,
  double height = 1.35,
  EdgeInsets paragraphPadding = const EdgeInsets.only(bottom: 8),
}) {
  final scheme = Theme.of(context).colorScheme;

  final text = textColor ?? scheme.onSurface;
  final accent = linkColor ?? scheme.primary;
  final surface = background ?? scheme.surface.withValues(alpha: 0.7);

  final body = TextStyle(fontSize: fontSize, height: height, color: text);
  final mono = TextStyle(
    fontSize: fontSize - 2,
    fontFamily: 'monospace',
    color: text,
    backgroundColor: surface,
  );

  return MarkdownStyleSheet(
    p: body,
    pPadding: paragraphPadding,
    a: TextStyle(
      color: accent,
      decoration: TextDecoration.underline,
      decorationColor: accent.withValues(alpha: 0.5),
    ),
    em: body.copyWith(fontStyle: FontStyle.italic),
    strong: body.copyWith(fontWeight: FontWeight.w700),
    h1: body.copyWith(fontSize: fontSize + 7, fontWeight: FontWeight.w700),
    h2: body.copyWith(fontSize: fontSize + 3, fontWeight: FontWeight.w700),
    h3: body.copyWith(fontSize: fontSize + 1, fontWeight: FontWeight.w600),
    h4: body.copyWith(fontWeight: FontWeight.w600),
    h5: body.copyWith(fontWeight: FontWeight.w600),
    h6: body.copyWith(fontWeight: FontWeight.w600),
    listBullet: body,
    blockquote: body,
    blockquotePadding: const EdgeInsets.all(12),
    blockquoteDecoration: BoxDecoration(
      color: surface,
      borderRadius: BorderRadius.circular(4),
      border: Border(left: BorderSide(color: accent, width: 3)),
    ),
    code: mono,
    codeblockPadding: const EdgeInsets.all(12),
    codeblockDecoration: BoxDecoration(
      color: surface,
      borderRadius: BorderRadius.circular(8),
    ),
    horizontalRuleDecoration: BoxDecoration(
      border: Border(top: BorderSide(color: scheme.outlineVariant)),
    ),
    tableHead: body.copyWith(fontWeight: FontWeight.w700),
    tableBody: body,
    tableBorder: TableBorder.all(color: scheme.outlineVariant),
    tableCellsPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
  );
}
