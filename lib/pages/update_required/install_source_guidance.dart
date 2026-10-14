import 'package:flutter/material.dart';

import '../../core/l10n/l10n.dart';
import '../../core/updater/self_update_capability.dart';
import '../../core/utils/platform.dart';
import '../../ui/components/copy_text_field.dart';

/// Terminal command refreshing the Snap package.
const String snapRefreshCommand = 'sudo snap refresh novyse';

/// Terminal command updating the Flatpak package.
const String flatpakUpdateCommand = 'flatpak update com.novyse.novyse';

/// Per-install-source update guidance rendered above the action buttons.
///
/// The banner/command matrix (see [InstallGuidance]):
/// - Snap / Flatpak: store banner plus the copyable terminal command that
///   actually performs the update (the store website links do not).
/// - RPM / DEB / AppImage / other system installs (Linux tarball-only
///   policy): tailored manual-download banner.
/// - macOS: uncertified-build banner, no in-app update.
/// - Read-only install dir: not-writable banner.
/// - Anything else: renders nothing.
class InstallSourceGuidance extends StatelessWidget {
  const InstallSourceGuidance({
    super.key,
    this.testOs,
    this.testSource,
    this.testGuidance,
  });

  /// Test-only overrides; when null the live environment is used.
  @visibleForTesting
  final AppOS? testOs;

  /// Test-only overrides; when null the live environment is used.
  @visibleForTesting
  final AppInstallSource? testSource;

  /// Test-only override for the resolved guidance.
  @visibleForTesting
  final InstallGuidance? testGuidance;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);

    final guidance =
        testGuidance ??
        resolveInstallGuidance(
          os: testOs ?? currentOS,
          source: testSource ?? currentInstallSource,
          linuxKind: detectLinuxPackageKind(),
          installWritable: isInstallDirectoryWritable(),
        );

    // Store display name follows the effective (possibly test-overridden)
    // source so widget tests stay deterministic on any host.
    final effectiveSource = testSource ?? currentInstallSource;
    final storeName = switch (effectiveSource) {
      AppInstallSource.snapStore => 'Snap Store',
      AppInstallSource.flathub => 'Flathub',
      _ => currentStoreName,
    };

    final String? banner = switch (guidance) {
      InstallGuidance.none => null,
      InstallGuidance.snapStore || InstallGuidance.flathub =>
        l10n.updaterStoreManaged(storeName!),
      InstallGuidance.linuxRpm => l10n.updaterLinuxRpm,
      InstallGuidance.linuxDeb => l10n.updaterLinuxDeb,
      InstallGuidance.linuxAppImage => l10n.updaterLinuxAppImage,
      InstallGuidance.linuxSystemUnknown => l10n.updaterSystemPackageManaged,
      InstallGuidance.macOSUncertified => l10n.updaterMacOSUncertified,
      InstallGuidance.readOnlyInstall => l10n.updaterReadOnlyInstall,
    };
    if (banner == null) return const SizedBox.shrink();

    final String? command = switch (guidance) {
      InstallGuidance.snapStore => snapRefreshCommand,
      InstallGuidance.flathub => flatpakUpdateCommand,
      _ => null,
    };

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          banner,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 13,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        if (command != null) ...[
          const SizedBox(height: 12),
          CopyTextField(
            value: command,
            copyTooltip: l10n.updaterCopyCommand,
            copiedTooltip: l10n.updaterCommandCopied,
          ),
        ],
        const SizedBox(height: 16),
      ],
    );
  }
}
