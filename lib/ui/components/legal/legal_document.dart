import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:material_ui/material_ui.dart';

import 'package:novyse/core/legal/legal_service.dart';
import 'package:novyse/ui/components/markdown/markdown_style.dart';

export 'package:novyse/core/legal/legal_service.dart'
    show LegalDocument, LegalService;

/// The document itself, shared by the settings page and the signup overlay.
///
/// The text comes from [LegalService]: the locally cached published version
/// when available, the asset bundled with the application otherwise.
class LegalDocumentBody extends StatelessWidget {
  const LegalDocumentBody({super.key, required this.document});

  final LegalDocument document;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return FutureBuilder<String>(
      future: LegalService.instance.load(document),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Text(
            snapshot.error.toString(),
            style: TextStyle(color: scheme.error),
          );
        }

        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        return MarkdownBody(
          data: snapshot.data!,
          selectable: true,
          styleSheet: appMarkdownStyleSheet(context),
        );
      },
    );
  }
}
