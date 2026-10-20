import 'package:flutter_test/flutter_test.dart';
import 'package:novyse/core/updater/self_update_capability.dart';
import 'package:novyse/core/utils/platform.dart';

void main() {
  group('canSelfUpdate', () {
    const desktopDirect = (
      platform: AppPlatform.desktop,
      source: AppInstallSource.direct,
    );

    test('windows direct installs always attempt', () {
      expect(
        canSelfUpdate(
          platform: desktopDirect.platform,
          os: AppOS.windows,
          source: desktopDirect.source,
          installWritable: true,
          hasTrustedKeys: true,
        ),
        isTrue,
      );
      // Even non-writable: Windows always attempts per policy.
      expect(
        canSelfUpdate(
          platform: desktopDirect.platform,
          os: AppOS.windows,
          source: desktopDirect.source,
          installWritable: false,
          hasTrustedKeys: true,
        ),
        isTrue,
      );
    });

    test('macOS never self-updates (uncertified builds)', () {
      expect(
        canSelfUpdate(
          platform: desktopDirect.platform,
          os: AppOS.macos,
          source: desktopDirect.source,
          installWritable: true,
          hasTrustedKeys: true,
        ),
        isFalse,
      );
    });

    test('linux only for writable portable installs (tarballs)', () {
      expect(
        canSelfUpdate(
          platform: desktopDirect.platform,
          os: AppOS.linux,
          source: desktopDirect.source,
          installWritable: true,
          hasTrustedKeys: true,
        ),
        isTrue,
      );
      expect(
        canSelfUpdate(
          platform: desktopDirect.platform,
          os: AppOS.linux,
          source: desktopDirect.source,
          installWritable: false,
          hasTrustedKeys: true,
        ),
        isFalse,
      );
    });

    test('store/system sources never self-update', () {
      for (final source in [
        AppInstallSource.playStore,
        AppInstallSource.snapStore,
        AppInstallSource.flathub,
        AppInstallSource.systemPackage,
      ]) {
        expect(
          canSelfUpdate(
            platform: AppPlatform.desktop,
            os: AppOS.linux,
            source: source,
            installWritable: true,
            hasTrustedKeys: true,
          ),
          isFalse,
          reason: source.name,
        );
      }
    });

    test('non-desktop and keyless installs never self-update', () {
      expect(
        canSelfUpdate(
          platform: AppPlatform.mobile,
          os: AppOS.android,
          source: AppInstallSource.direct,
          installWritable: true,
          hasTrustedKeys: true,
        ),
        isFalse,
      );
      expect(
        canSelfUpdate(
          platform: AppPlatform.web,
          os: AppOS.web,
          source: AppInstallSource.direct,
          installWritable: true,
          hasTrustedKeys: true,
        ),
        isFalse,
      );
      expect(
        canSelfUpdate(
          platform: AppPlatform.desktop,
          os: AppOS.windows,
          source: AppInstallSource.direct,
          installWritable: true,
          hasTrustedKeys: false,
        ),
        isFalse,
      );
    });
  });

  group('resolveLinuxPackageKind', () {
    test('store and portable sources map directly', () {
      expect(
        resolveLinuxPackageKind(
          source: AppInstallSource.snapStore,
          isAppImage: false,
          osReleaseTokens: const {},
        ),
        LinuxPackageKind.snap,
      );
      expect(
        resolveLinuxPackageKind(
          source: AppInstallSource.flathub,
          isAppImage: false,
          osReleaseTokens: const {},
        ),
        LinuxPackageKind.flatpak,
      );
      expect(
        resolveLinuxPackageKind(
          source: AppInstallSource.direct,
          isAppImage: false,
          osReleaseTokens: const {},
        ),
        LinuxPackageKind.portable,
      );
    });

    test('system packages resolve via appimage flag then distro family', () {
      LinuxPackageKind kind({
        bool appImage = false,
        Set<String> tokens = const {},
      }) =>
          resolveLinuxPackageKind(
            source: AppInstallSource.systemPackage,
            isAppImage: appImage,
            osReleaseTokens: tokens,
          );

      expect(kind(appImage: true), LinuxPackageKind.appimage);
      expect(kind(tokens: {'fedora'}), LinuxPackageKind.rpm);
      expect(kind(tokens: {'rhel', 'centos'}), LinuxPackageKind.rpm);
      expect(kind(tokens: {'opensuse', 'suse'}), LinuxPackageKind.rpm);
      expect(kind(tokens: {'debian'}), LinuxPackageKind.deb);
      expect(kind(tokens: {'ubuntu', 'debian'}), LinuxPackageKind.deb);
      expect(kind(), LinuxPackageKind.systemUnknown);
      expect(kind(tokens: {'arch'}), LinuxPackageKind.systemUnknown);
    });
  });

  group('resolveInstallGuidance', () {
    test('macOS is always uncertified', () {
      expect(
        resolveInstallGuidance(
          os: AppOS.macos,
          source: AppInstallSource.direct,
          linuxKind: LinuxPackageKind.portable,
          installWritable: true,
        ),
        InstallGuidance.macOSUncertified,
      );
    });

    test('stores resolve to store guidance', () {
      expect(
        resolveInstallGuidance(
          os: AppOS.linux,
          source: AppInstallSource.snapStore,
          linuxKind: LinuxPackageKind.snap,
          installWritable: true,
        ),
        InstallGuidance.snapStore,
      );
      expect(
        resolveInstallGuidance(
          os: AppOS.linux,
          source: AppInstallSource.flathub,
          linuxKind: LinuxPackageKind.flatpak,
          installWritable: true,
        ),
        InstallGuidance.flathub,
      );
    });

    test('linux system packages resolve per distro kind', () {
      InstallGuidance guidance(LinuxPackageKind kind) =>
          resolveInstallGuidance(
            os: AppOS.linux,
            source: AppInstallSource.systemPackage,
            linuxKind: kind,
            installWritable: false,
          );

      expect(guidance(LinuxPackageKind.appimage), InstallGuidance.linuxAppImage);
      expect(guidance(LinuxPackageKind.rpm), InstallGuidance.linuxRpm);
      expect(guidance(LinuxPackageKind.deb), InstallGuidance.linuxDeb);
      expect(
        guidance(LinuxPackageKind.systemUnknown),
        InstallGuidance.linuxSystemUnknown,
      );
    });

    test('linux direct non-writable is read-only, writable is none', () {
      expect(
        resolveInstallGuidance(
          os: AppOS.linux,
          source: AppInstallSource.direct,
          linuxKind: LinuxPackageKind.portable,
          installWritable: false,
        ),
        InstallGuidance.readOnlyInstall,
      );
      expect(
        resolveInstallGuidance(
          os: AppOS.linux,
          source: AppInstallSource.direct,
          linuxKind: LinuxPackageKind.portable,
          installWritable: true,
        ),
        InstallGuidance.none,
      );
    });

    test('windows direct resolves to none', () {
      expect(
        resolveInstallGuidance(
          os: AppOS.windows,
          source: AppInstallSource.direct,
          linuxKind: LinuxPackageKind.portable,
          installWritable: true,
        ),
        InstallGuidance.none,
      );
    });
  });
}
