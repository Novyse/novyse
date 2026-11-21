import 'package:flutter/services.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:material_ui/material_ui.dart';

import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';

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

class LegalDocumentPage extends StatelessWidget {
  const LegalDocumentPage({
    super.key,
    required this.document,
    required this.title,
  });

  final LegalDocument document;
  final String title;

  @override
  Widget build(BuildContext context) {
    return SettingsPageTemplate(
      title: title,
      children: [
        SettingsSection(
          children: [
            FutureBuilder<String>(
              future: document.load(),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      snapshot.error.toString(),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  );
                }
                if (!snapshot.hasData) {
                  return const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                return Padding(
                  padding: const EdgeInsets.all(16),
                  child: MarkdownBody(data: snapshot.data!, selectable: true),
                );
              },
            ),
          ],
        ),
      ],
    );
  }
}
