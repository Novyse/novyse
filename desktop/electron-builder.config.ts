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
  publish: {
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
        ? ["AppImage", "deb", "rpm", "snap", "flatpak"]
        : ["AppImage", "deb", "rpm"],
    icon: "../assets/images/logo.svg",
    artifactName: `novyse${suffix}.\${ext}`,
  },
  appImage: {
    artifactName: `Novyse${suffix}.AppImage`,
  },
  rpm: {
    fpm: ["--rpm-rpmbuild-define=_build_id_links none"],
  },
};
