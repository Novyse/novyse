import 'dart:async';

import 'package:material_ui/material_ui.dart';

import 'package:novyse/ui/components/legal/legal_document.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';

export 'package:novyse/ui/components/legal/legal_document.dart';

/// The document as a settings page: the entry point of the legal section.
class LegalDocumentPage extends StatefulWidget {
  const LegalDocumentPage({
    super.key,
    required this.document,
    required this.title,
  });

  final LegalDocument document;
  final String title;

  @override
  State<LegalDocumentPage> createState() => _LegalDocumentPageState();
}

class _LegalDocumentPageState extends State<LegalDocumentPage> {
  @override
  void initState() {
    super.initState();

    unawaited(LegalService.instance.prefetch());
  }

  @override
  Widget build(BuildContext context) {
    final document = widget.document;
    final title = widget.title;

    return SettingsPageTemplate(
      title: title,
      children: [
        SettingsSection(
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: LegalDocumentBody(document: document),
            ),
          ],
        ),
      ],
    );
  }
}
