import appConfig, { BRANCH } from "../app.config";
const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);
const appName = capitalize(appConfig.expo.name);
const identifier =
  "com.novyse.desktop" +
  (BRANCH === "development" ? ".dev" : BRANCH === "preview" ? ".preview" : "");
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
  },
  win: {
    target: ["nsis", "msi", "portable"],
    icon: "../assets/images/logo-novyse.png",
  },
  linux: {
    category: "Network",
    target:
      BRANCH === "production"
        ? ["AppImage", "deb", "rpm", "snap", "flatpak"]
        : ["AppImage", "deb", "rpm"],
    icon: "../assets/images/logo.svg",
  },
  rpm: {
    fpm: ["--rpm-rpmbuild-define=_build_id_links none"],
  },
};
