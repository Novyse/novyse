import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:url_launcher/url_launcher.dart';

class MessageText extends StatelessWidget {
  const MessageText({
    super.key,
    required this.content,
    this.isSender = false,
    this.isSelected = false,
    this.onLinkTap,
    this.highlightQuery = '',
    this.isCurrentMatch = false,
    this.quoteHighlightRange,
    this.onSelectionChanged,
    this.onOpenContextMenu,
  });

  final String content;
  final bool isSender;
  final bool isSelected;
  final void Function(String url)? onLinkTap;
  final String highlightQuery;
  final bool isCurrentMatch;
  final TextRange? quoteHighlightRange;
  final ValueChanged<String?>? onSelectionChanged;
  final void Function(Offset position)? onOpenContextMenu;

  List<TextSpan> _highlightSpans(
    String source,
    String query,
    TextStyle base,
    TextStyle highlight,
  ) {
    final spans = <TextSpan>[];
    final lowerSource = source.toLowerCase();
    final lowerQuery = query.toLowerCase();
    int start = 0;
    while (true) {
      final index = lowerSource.indexOf(lowerQuery, start);
      if (index < 0) {
        spans.add(TextSpan(text: source.substring(start), style: base));
        break;
      }
      if (index > start) {
        spans.add(TextSpan(text: source.substring(start, index), style: base));
      }
      spans.add(
        TextSpan(
          text: source.substring(index, index + query.length),
          style: highlight,
        ),
      );
      start = index + query.length;
    }
    return spans;
  }

  @override
  Widget build(BuildContext context) {
    if (content.trim().isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final trimmedHighlight = highlightQuery.trim();
    final Widget bodyWidget;
    if (trimmedHighlight.isNotEmpty &&
        content.toLowerCase().contains(trimmedHighlight.toLowerCase())) {
      final baseStyle = TextStyle(
        fontSize: 15,
        height: 1.35,
        color: isSender ? colorScheme.onPrimary : colorScheme.onSurface,
      );
      final highlightStyle = baseStyle.copyWith(
        backgroundColor: isCurrentMatch
            ? colorScheme.primaryContainer.withValues(alpha: 0.85)
            : colorScheme.primaryContainer.withValues(alpha: 0.35),
        color: isCurrentMatch ? colorScheme.onPrimary : baseStyle.color,
        fontWeight: FontWeight.w700,
      );
      bodyWidget = Text.rich(
        TextSpan(
          children: _highlightSpans(
            content,
            trimmedHighlight,
            baseStyle,
            highlightStyle,
          ),
        ),
      );
    } else if (quoteHighlightRange != null &&
        isCurrentMatch &&
        quoteHighlightRange!.start >= 0 &&
        quoteHighlightRange!.start < content.length &&
        quoteHighlightRange!.end <= content.length &&
        quoteHighlightRange!.start < quoteHighlightRange!.end) {
      final baseStyle = TextStyle(
        fontSize: 15,
        height: 1.35,
        color: isSender ? colorScheme.onPrimary : colorScheme.onSurface,
      );
      final highlightStyle = baseStyle.copyWith(
        backgroundColor: isSender
            ? colorScheme.onPrimary.withValues(alpha: 0.35)
            : colorScheme.primaryContainer.withValues(alpha: 0.85),
        color: isSender
            ? colorScheme.onPrimary
            : colorScheme.onPrimaryContainer,
        fontWeight: FontWeight.w700,
      );
      final start = quoteHighlightRange!.start;
      final end = quoteHighlightRange!.end;
      bodyWidget = Text.rich(
        TextSpan(
          children: [
            if (start > 0)
              TextSpan(text: content.substring(0, start), style: baseStyle),
            TextSpan(
              text: content.substring(start, end),
              style: highlightStyle,
            ),
            if (end < content.length)
              TextSpan(text: content.substring(end), style: baseStyle),
          ],
        ),
      );
    } else {
      final textColor = isSender
          ? colorScheme.onPrimary
          : colorScheme.onSurface;

      final codeBgColor = isSender
          ? colorScheme.onPrimary.withValues(alpha: 0.15)
          : colorScheme.surface.withValues(alpha: 0.7);

      final linkColor = isSender ? colorScheme.onPrimary : colorScheme.primary;

      // Process mentions as links (@username -> novyse://user/username)
      final preprocessed = content.replaceAllMapped(
        RegExp(r'(^|\s)@([a-zA-Z0-9_.-]+)'),
        (match) => '${match[1]}[@${match[2]}](novyse://user/${match[2]})',
      );

      final defaultStyle = TextStyle(
        fontSize: 15,
        height: 1.35,
        color: textColor,
      );

      final styleSheet = MarkdownStyleSheet.fromTheme(theme).copyWith(
        p: defaultStyle,
        pPadding: EdgeInsets.zero,
        code: TextStyle(
          fontSize: 13.5,
          fontFamily: 'monospace',
          color: textColor,
          backgroundColor: codeBgColor,
        ),
        codeblockDecoration: BoxDecoration(
          color: codeBgColor,
          borderRadius: BorderRadius.circular(8),
        ),
        blockquoteDecoration: BoxDecoration(
          color: codeBgColor,
          borderRadius: BorderRadius.circular(4),
          border: Border(left: BorderSide(color: linkColor, width: 3)),
        ),
        a: TextStyle(
          color: linkColor,
          decoration: TextDecoration.underline,
          decorationColor: linkColor.withValues(alpha: 0.5),
        ),
      );

      bodyWidget = MarkdownBody(
        data: preprocessed,
        selectable: false,
        styleSheet: styleSheet,
        onTapLink: (text, href, title) async {
          if (href == null) return;
          if (onLinkTap != null) {
            onLinkTap!(href);
            return;
          }
          final uri = Uri.tryParse(href);
          if (uri != null && await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          }
        },
      );
    }

    return SelectionArea(
      onSelectionChanged: (SelectedContent? selectedContent) {
        final text = selectedContent?.plainText;
        onSelectionChanged?.call(
          (text != null && text.trim().isNotEmpty) ? text : null,
        );
      },
      contextMenuBuilder: (context, selectableRegionState) {
        final anchor = selectableRegionState.contextMenuAnchors.primaryAnchor;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!context.mounted) return;
          selectableRegionState.hideToolbar();
          onOpenContextMenu?.call(anchor);
        });
        return const SizedBox.shrink();
      },
      child: bodyWidget,
    );
  }
}
