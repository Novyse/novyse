import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:novyse/core/l10n/l10n.dart';
import 'package:novyse/ui/components/settings/settings_page_template.dart';
import 'package:novyse/ui/components/settings/settings_section.dart';

class AppLicensePage extends StatelessWidget {
  const AppLicensePage({super.key});

  static Future<String> loadText() => rootBundle.loadString('LICENSE');

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return SettingsPageTemplate(
      title: l10n.settingsItemAppLicenseTitle,
      children: [
        SettingsSection(
          children: [
            FutureBuilder<String>(
              future: loadText(),
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
                  child: SelectableText(
                    snapshot.data!,
                    style: const TextStyle(fontSize: 13, height: 1.5),
                  ),
                );
              },
            ),
          ],
        ),
      ],
    );
  }
}
