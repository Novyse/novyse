import appConfig, { BRANCH } from "../app.config";
const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);
const appName = capitalize(appConfig.expo.name);
const identifier =
  "com.novyse.desktop" +
  (BRANCH === "development" ? ".dev" : BRANCH === "preview" ? ".preview" : "");
const suffix =
  BRANCH === "preview" ? "-preview" : BRANCH === "development" ? "-dev" : "";

export default {
  appId: identifier,
  productName: appName,
  asar: true,
  asarUnpack: ["**/*.node", "node_modules/@img/**", "node_modules/sharp/**"],
  publish: [
    {
      provider: "github",
      owner: "Novyse",
      repo: "novyse",
      channel:
        BRANCH === "preview"
          ? "preview"
          : BRANCH === "development"
            ? "dev"
            : "latest",
    },
    {
      provider: "snapStore",
      repo: "novyse",
      channels: ["stable"],
    },
  ],
  directories: {
    output: "dist",
    buildResources: "build-assets",
  },
  files: [
    "build/**/*",
    "node_modules/**/*",
    "package.json",
    {
      from: "../dist",
      to: "dist",
    },
    {
      from: "../assets/images",
      to: "assets/images",
      filter: ["logo-novyse.png"],
    },
  ],
  mac: {
    category: "public.app-category.social-networking",
    target: ["dmg", "zip"],
    icon: "../assets/images/logo-novyse.png",
    extendInfo: {
      NSAudioCaptureUsageDescription:
        "This app requires access to system audio for screen sharing.",
      NSScreenCaptureUsageDescription:
        "This app requires access to screen recording to share your screen.",
    },
    artifactName: `Novyse-mac${suffix}.\${ext}`,
  },
  dmg: {
    artifactName: `Novyse${suffix}.dmg`,
  },
  win: {
    target: ["nsis", "portable", "msi"],
    icon: "../assets/images/logo-novyse.png",
  },
  nsis: {
    artifactName: `Novyse-Setup${suffix}.exe`,
  },
  portable: {
    artifactName: `Novyse-Portable${suffix}.exe`,
  },
  msi: {
    artifactName: `Novyse-Setup${suffix}.msi`,
  },
  linux: {
    category: "Network",
    target:
      BRANCH === "production"
        ? ["AppImage", "deb", "rpm", "flatpak", "snap"]
        : ["AppImage", "deb", "rpm", "flatpak"],
    icon: "../assets/images/logo.svg",
    artifactName: `novyse${suffix}.\${ext}`,
  },
  appImage: {
    artifactName: `Novyse${suffix}.AppImage`,
  },
  flatpak: {
    artifactName: `novyse${suffix}.flatpak`,
    runtimeVersion: "24.08",
    finishArgs: [
      "--socket=x11",
      "--socket=wayland",
      "--share=ipc",
      "--share=network",
      "--filesystem=home",
      "--talk-name=org.freedesktop.Notifications",
      "--talk-name=org.kde.StatusNotifierWatcher",
      "--talk-name=com.canonical.AppMenu.Registrar",
      "--device=dri",
      "--socket=pulseaudio",
    ],
  },
  rpm: {
    fpm: ["--rpm-rpmbuild-define=_build_id_links none"],
  },
  snap: {
    base: "core24",
    confinement: "strict",
    artifactName: `Novyse${suffix}.snap`,
  },
};
