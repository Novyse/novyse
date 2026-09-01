import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:novyse/core/l10n/l10n.dart';

enum _MenuLevel { main, formatting }

/// A rich context selection toolbar with an encapsulated formatting submenu for Desktop/Web,
/// and flat formatting options directly for Mobile.
class ChatContextMenu extends StatefulWidget {
  const ChatContextMenu({
    super.key,
    required this.editableTextState,
    required this.controller,
    this.onPaste,
  });

  final EditableTextState editableTextState;
  final TextEditingController controller;
  final VoidCallback? onPaste;

  @override
  State<ChatContextMenu> createState() => _ChatContextMenuState();
}

class _ChatContextMenuState extends State<ChatContextMenu> {
  _MenuLevel _level = _MenuLevel.main;

  bool get _isMobile =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  void _wrapSelection(String prefix, String suffix) {
    final selection = widget.controller.selection;
    final text = widget.controller.text;

    if (!selection.isValid || selection.isCollapsed) {
      final cursor = selection.isValid ? selection.start : text.length;
      final newText = text.replaceRange(cursor, cursor, '$prefix$suffix');
      widget.controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: cursor + prefix.length),
      );
    } else {
      final selectedText = text.substring(selection.start, selection.end);
      final newText = text.replaceRange(
        selection.start,
        selection.end,
        '$prefix$selectedText$suffix',
      );
      widget.controller.value = TextEditingValue(
        text: newText,
        selection: TextSelection(
          baseOffset: selection.start,
          extentOffset:
              selection.start +
              prefix.length +
              selectedText.length +
              suffix.length,
        ),
      );
    }
  }

  void _clearFormatting() {
    final selection = widget.controller.selection;
    final text = widget.controller.text;
    if (!selection.isValid || selection.isCollapsed) return;

    var selectedText = text.substring(selection.start, selection.end);
    selectedText = selectedText
        .replaceAll('**', '')
        .replaceAll('~~', '')
        .replaceAll('||', '')
        .replaceAll('`', '')
        .replaceAll('<u>', '')
        .replaceAll('</u>', '')
        .replaceAllMapped(RegExp(r'\[(.*?)\]\(.*?\)'), (m) => m[1] ?? '')
        .replaceAll('*', '');

    final newText = text.replaceRange(
      selection.start,
      selection.end,
      selectedText,
    );
    widget.controller.value = TextEditingValue(
      text: newText,
      selection: TextSelection(
        baseOffset: selection.start,
        extentOffset: selection.start + selectedText.length,
      ),
    );
  }

  Future<void> _insertLink() async {
    final selection = widget.controller.selection;
    final text = widget.controller.text;
    final selectedText = (selection.isValid && !selection.isCollapsed)
        ? text.substring(selection.start, selection.end)
        : '';

    final urlController = TextEditingController();
    final l10n = AppLocalizations.of(context)!;

    final url = await showDialog<String>(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: Text(l10n.formatLink),
        content: TextField(
          controller: urlController,
          autofocus: true,
          decoration: InputDecoration(
            hintText: l10n.linkUrlHint,
            labelText: 'URL',
          ),
          keyboardType: TextInputType.url,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: Text(l10n.cancel),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.of(dialogCtx).pop(urlController.text.trim()),
            child: Text(l10n.apply),
          ),
        ],
      ),
    );

    if (url != null && url.isNotEmpty) {
      final linkText = selectedText.isNotEmpty ? selectedText : url;
      final markdownLink = '[$linkText]($url)';
      if (selection.isValid && !selection.isCollapsed) {
        final newText = text.replaceRange(
          selection.start,
          selection.end,
          markdownLink,
        );
        widget.controller.value = TextEditingValue(
          text: newText,
          selection: TextSelection.collapsed(
            offset: selection.start + markdownLink.length,
          ),
        );
      } else {
        final cursor = selection.isValid ? selection.start : text.length;
        final newText = text.replaceRange(cursor, cursor, markdownLink);
        widget.controller.value = TextEditingValue(
          text: newText,
          selection: TextSelection.collapsed(
            offset: cursor + markdownLink.length,
          ),
        );
      }
    }
  }

  List<ContextMenuButtonItem> _buildRawFormattingButtons(
    BuildContext context,
    AppLocalizations l10n, {
    required bool includeBackButton,
  }) {
    return [
      if (includeBackButton)
        ContextMenuButtonItem(
          label: '◂ ${l10n.back}',
          onPressed: () {
            setState(() {
              _level = _MenuLevel.main;
            });
          },
        ),
      ContextMenuButtonItem(
        label: l10n.formatBold,
        onPressed: () {
          widget.editableTextState.hideToolbar();
          _wrapSelection('**', '**');
        },
      ),
      ContextMenuButtonItem(
        label: l10n.formatItalic,
        onPressed: () {
          widget.editableTextState.hideToolbar();
          _wrapSelection('*', '*');
        },
      ),
      ContextMenuButtonItem(
        label: l10n.formatMonospace,
        onPressed: () {
          widget.editableTextState.hideToolbar();
          _wrapSelection('`', '`');
        },
      ),
      ContextMenuButtonItem(
        label: l10n.formatStrikethrough,
        onPressed: () {
          widget.editableTextState.hideToolbar();
          _wrapSelection('~~', '~~');
        },
      ),
      ContextMenuButtonItem(
        label: l10n.formatUnderline,
        onPressed: () {
          widget.editableTextState.hideToolbar();
          _wrapSelection('<u>', '</u>');
        },
      ),
      ContextMenuButtonItem(
        label: l10n.formatSpoiler,
        onPressed: () {
          widget.editableTextState.hideToolbar();
          _wrapSelection('||', '||');
        },
      ),
      ContextMenuButtonItem(
        label: l10n.formatLink,
        onPressed: () {
          widget.editableTextState.hideToolbar();
          _insertLink();
        },
      ),
      ContextMenuButtonItem(
        label: l10n.formatRegular,
        onPressed: () {
          widget.editableTextState.hideToolbar();
          _clearFormatting();
        },
      ),
    ];
  }

  List<ContextMenuButtonItem> _buildMainButtons(
    BuildContext context,
    AppLocalizations l10n,
  ) {
    final defaultButtons = widget.editableTextState.contextMenuButtonItems;
    final selection = widget.controller.selection;
    final hasSelection = selection.isValid && !selection.isCollapsed;

    final hasPasteButton =
        defaultButtons.any((item) => item.type == ContextMenuButtonType.paste);
    final buttons = [
      if (!hasPasteButton && widget.onPaste != null)
        ContextMenuButtonItem(
          type: ContextMenuButtonType.paste,
          label: MaterialLocalizations.of(context).pasteButtonLabel,
          onPressed: () {
            widget.editableTextState.hideToolbar();
            widget.onPaste?.call();
          },
        ),
      ...defaultButtons.map((item) {
        if (item.type == ContextMenuButtonType.paste) {
          return ContextMenuButtonItem(
            type: item.type,
            label: item.label,
            onPressed: () {
              item.onPressed?.call();
              widget.onPaste?.call();
            },
          );
        }
        return item;
      }),
    ];

    if (!hasSelection) {
      return buttons;
    }

    if (_isMobile) {
      return [
        ...buttons,
        ..._buildRawFormattingButtons(context, l10n, includeBackButton: false),
      ];
    }

    return [
      ...buttons,
      ContextMenuButtonItem(
        label: '${l10n.formatting} ▸',
        onPressed: () {
          setState(() {
            _level = _MenuLevel.formatting;
          });
        },
      ),
    ];
  }

  List<ContextMenuButtonItem> _buildFormattingButtons(
    BuildContext context,
    AppLocalizations l10n,
  ) {
    return _buildRawFormattingButtons(context, l10n, includeBackButton: true);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final items = _level == _MenuLevel.main
        ? _buildMainButtons(context, l10n)
        : _buildFormattingButtons(context, l10n);

    return AdaptiveTextSelectionToolbar.buttonItems(
      anchors: widget.editableTextState.contextMenuAnchors,
      buttonItems: items,
    );
  }
}
