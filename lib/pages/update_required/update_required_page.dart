import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:novyse/ui/components/button/app_button.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/global.dart' as config;
import '../../core/l10n/l10n.dart';
import '../../core/updater/app_updater.dart';
import '../../core/updater/self_update_capability.dart';
import '../../core/utils/platform.dart';
import 'install_source_guidance.dart';

/// Screen displayed when the client version is outdated and an update is required.
class UpdateRequiredPage extends StatefulWidget {
  const UpdateRequiredPage({super.key, this.minVersion});

  final String? minVersion;

  @override
  State<UpdateRequiredPage> createState() => _UpdateRequiredPageState();
}

enum _DesktopUpdatePhase { idle, working, error, upToDate }

class _UpdateRequiredPageState extends State<UpdateRequiredPage> {
  DesktopUpdaterController? _controller;
  _DesktopUpdatePhase _phase = _DesktopUpdatePhase.idle;
  String? _statusText;
  double? _progress;
  String? _error;
  String? _errorDetails;

  bool get _isDesktop => currentPlatform == AppPlatform.desktop;
  String? get _managingStore => currentStoreName;

  bool get _canSelfUpdate =>
      _isDesktop && canSelfUpdateInstallation();

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  String _getFallbackButtonLabel(AppLocalizations l10n) {
    if (kIsWeb) return l10n.refreshPage;
    if (_managingStore != null) return l10n.updaterOpenStore(_managingStore!);
    return switch (currentOS) {
      AppOS.web => l10n.refreshPage,
      AppOS.android => l10n.openPlayStore,
      AppOS.ios => l10n.openAppStore,
      AppOS.windows || AppOS.linux || AppOS.macos || AppOS.fuchsia =>
        l10n.updaterOpenWebsite,
    };
  }

  Future<void> _handleFallbackAction() async {
    if (kIsWeb) {
      final uri = Uri.parse(config.appUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, webOnlyWindowName: '_self');
      }
      return;
    }
    final url = switch (currentOS) {
      AppOS.android => config.playStoreUrl,
      AppOS.ios => config.appStoreUrl,
      AppOS.linux when currentInstallSource == AppInstallSource.snapStore =>
        config.snapStoreUrl,
      AppOS.linux when currentInstallSource == AppInstallSource.flathub =>
        config.flathubUrl,
      AppOS.windows || AppOS.linux || AppOS.macos || AppOS.fuchsia =>
        config.downloadPageUrl,
      AppOS.web => config.appUrl,
    };
    if (url.isNotEmpty) {
      final uri = Uri.parse(url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }
  }

  void _bindController(DesktopUpdaterController controller) {
    controller.addListener(() {
      if (!mounted) return;
      final state = controller.state;
      setState(() {
        if (state is UpdateChecking) {
          _statusText = null;
          _progress = null;
        } else if (state is UpdateDownloading) {
          final total = state.totalBytes;
          _progress = total > 0 ? state.receivedBytes / total : null;
        } else if (state is UpdateInstalling) {
          _progress = null;
        }
      });
    });
  }

  Future<void> _handleDesktopUpdate(AppLocalizations l10n) async {
    if (!_canSelfUpdate) {
      await _handleFallbackAction();
      return;
    }
    if (_phase == _DesktopUpdatePhase.working) return;
    setState(() {
      _phase = _DesktopUpdatePhase.working;
      _error = null;
      _errorDetails = null;
      _progress = null;
      _statusText = l10n.updaterChecking;
    });
    try {
      _controller ??= await createDesktopUpdaterController();
      final controller = _controller!;
      _bindController(controller);

      final result = await controller.checkForUpdates();
      if (!mounted) return;

      if (result is ManualUpdateCheckUpToDate) {
        setState(() {
          _phase = _DesktopUpdatePhase.upToDate;
          _statusText = l10n.updaterNoUpdate;
        });
        return;
      }
      if (result is ManualUpdateCheckFreshInstallRequired ||
          result is ManualUpdateCheckBlockedBySupportPolicy) {
        await _handleFallbackAction();
        setState(() => _phase = _DesktopUpdatePhase.idle);
        return;
      }
      if (result is ManualUpdateCheckFailed) {
        throw result.error;
      }

      setState(() => _statusText = l10n.updaterVerifying);
      await controller.downloadUpdate();
      if (!mounted) return;

      setState(() => _statusText = l10n.updaterInstalling);
      await controller.restartApp();
      if (!mounted) return;
      setState(() => _statusText = l10n.updaterRestarting);
    } catch (e, st) {
      debugPrint('[updater] Update failed: $e\n$st');
      if (!mounted) return;
      setState(() {
        _phase = _DesktopUpdatePhase.error;
        _error = l10n.updaterError;
        _errorDetails = e.toString();
        _statusText = null;
        _progress = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    return Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              theme.colorScheme.primary,
              theme.colorScheme.primaryContainer,
            ],
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
                    color: theme.colorScheme.surface.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: theme.shadowColor.withValues(alpha: 0.1),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
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
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        l10n.updateRequiredSubtitle,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 14,
                          color: theme.colorScheme.onSurfaceVariant,
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
                          color: theme.colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: Wrap(
                          spacing: 16,
                          runSpacing: 8,
                          alignment: WrapAlignment.center,
                          children: [
                            Text(
                              l10n.currentVersion(config.appVersion),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                            if (widget.minVersion != null &&
                                widget.minVersion!.isNotEmpty)
                              Text(
                                l10n.requiredVersion(widget.minVersion!),
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: theme.colorScheme.primary,
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                      if (_isDesktop) ...[
                        const InstallSourceGuidance(),
                        if (_phase == _DesktopUpdatePhase.working) ...[
                          if (_progress != null)
                            LinearProgressIndicator(value: _progress),
                          if (_progress == null)
                            const LinearProgressIndicator(),
                          const SizedBox(height: 12),
                          Text(
                            _statusTextWithProgress(l10n),
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                        if (_phase == _DesktopUpdatePhase.error &&
                            _error != null) ...[
                          Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              color: theme.colorScheme.error,
                            ),
                          ),
                          if (_errorDetails != null &&
                              _errorDetails!.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            SelectableText(
                              _errorDetails!,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 11,
                                fontFamily: 'monospace',
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                          const SizedBox(height: 16),
                        ],
                        if (_phase == _DesktopUpdatePhase.upToDate) ...[
                          Text(
                            l10n.updaterNoUpdate,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],
                        if (_canSelfUpdate &&
                            _phase != _DesktopUpdatePhase.working &&
                            _phase != _DesktopUpdatePhase.error) ...[
                          AppButton(
                            label: l10n.updaterUpdateNow,
                            onPressed: () => _handleDesktopUpdate(l10n),
                          ),
                          const SizedBox(height: 12),
                        ],
                        AppButton(
                          label: _getFallbackButtonLabel(l10n),
                          onPressed: () => _handleFallbackAction(),
                        ),
                        if (_phase == _DesktopUpdatePhase.error) ...[
                          const SizedBox(height: 12),
                          AppButton(
                            label: l10n.updaterRetry,
                            onPressed: () => _handleDesktopUpdate(l10n),
                          ),
                        ],
                      ] else ...[
                        AppButton(
                          label: _getFallbackButtonLabel(l10n),
                          onPressed: () => _handleFallbackAction(),
                        ),
                      ],
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

  String _statusTextWithProgress(AppLocalizations l10n) {
    final state = _controller?.state;
    if (state is UpdateDownloading) {
      final pct = _progress == null
          ? ''
          : ' ${(_progress! * 100).toStringAsFixed(0)}%';
      return l10n.updaterDownloading(pct);
    }
    if (state is UpdateInstalling) return l10n.updaterInstalling;
    return _statusText ?? l10n.updaterChecking;
  }
}
