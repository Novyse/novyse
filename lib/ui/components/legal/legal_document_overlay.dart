import 'package:material_ui/material_ui.dart';

import 'package:novyse/ui/components/legal/legal_document.dart';
import 'package:novyse/ui/components/responsiveOverlay/responsive_overlay.dart';

export 'package:novyse/ui/components/legal/legal_document.dart';

/// Shows a legal document in the overlay of the platform.
///
/// The overlay decides the shape: a bottom sheet where the screen is small,
/// a dialog on the desktop and on the web. The title bar, the padding and the
/// scrolling come from it too, so the body only renders the text. The signup
/// uses this; the settings open the document as a page instead.
Future<void> showLegalDocument(
  BuildContext context, {
  required LegalDocument document,
  required String title,
}) {
  return ResponsiveOverlay.show<void>(
    context: context,
    title: title,
    child: LegalDocumentBody(document: document),
  );
}
