import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/config/global.dart' as config;
import '../core/l10n/l10n.dart';
import '../core/utils/platform.dart';

/// Screen displayed when the client version is outdated and an update is required.
class UpdateRequiredPage extends StatelessWidget {
  const UpdateRequiredPage({super.key, this.minVersion});

  final String? minVersion;

  static const _githubUrl = 'https://github.com/Novyse/novyse/releases';
  static const _playStoreUrl =
      'https://play.google.com/store/apps/details?id=com.novyse';
  static const _appStoreUrl = 'https://apps.apple.com/app/novyse';

  String _getButtonLabel(AppLocalizations l10n) {
    if (kIsWeb) return l10n.refreshPage;
    return switch (currentOS) {
      AppOS.web => l10n.refreshPage,
      AppOS.android => l10n.openPlayStore,
      AppOS.ios => l10n.openAppStore,
      AppOS.windows ||
      AppOS.linux ||
      AppOS.macos ||
      AppOS.fuchsia => l10n.openGitHub,
    };
  }

  Future<void> _handleAction() async {
    if (kIsWeb) {
      final uri = Uri.parse(config.appUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, webOnlyWindowName: '_self');
      }
      return;
    }

    final url = switch (currentOS) {
      AppOS.android => _playStoreUrl,
      AppOS.ios => _appStoreUrl,
      _ => _githubUrl,
    };

    if (url.isNotEmpty) {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF013480), Color(0xFF177FC0)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 40,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF9DB8D5),
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: const [
                      BoxShadow(
                        color: Colors.black26,
                        blurRadius: 20,
                        offset: Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Image.asset(
                        'assets/images/logo-novyse.png',
                        width: 80,
                        height: 80,
                        fit: BoxFit.contain,
                      ),
                      const SizedBox(height: 20),
                      Text(
                        l10n.updateRequiredTitle,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF073B82),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        l10n.updateRequiredSubtitle,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 14,
                          color: Color(0xFF1E293B),
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Wrap(
                          spacing: 16,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: [
                            Text(
                              l10n.currentVersion(config.appVersion),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF073B82),
                              ),
                            ),
                            if (minVersion != null && minVersion!.isNotEmpty)
                              Text(
                                l10n.requiredVersion(minVersion!),
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFFC026D3),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: FilledButton(
                          onPressed: _handleAction,
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFF013480),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(24),
                            ),
                          ),
                          child: Text(
                            _getButtonLabel(l10n),
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
