import 'package:flutter/services.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:material_ui/material_ui.dart';

import 'package:novyse/ui/components/markdown/markdown_style.dart';

/// A legal document bundled with the application.
///
/// The documents are shipped as assets: the text shown to the user is exactly
/// the one that was accepted at signup, and it is readable without network.
enum LegalDocument {
  privacy('legal/privacy-policy.md'),
  terms('legal/terms-of-service.md');

  const LegalDocument(this.asset);

  final String asset;

  Future<String> load() => rootBundle.loadString(asset);
}

/// The document itself, shared by the settings page and the signup overlay.
class LegalDocumentBody extends StatelessWidget {
  const LegalDocumentBody({super.key, required this.document});

  final LegalDocument document;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return FutureBuilder<String>(
      future: document.load(),
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
