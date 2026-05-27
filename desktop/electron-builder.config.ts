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
    target: ["dmg"],
    icon: "../assets/images/logo-novyse.png",
  },
  win: {
    target: ["nsis"],
    icon: "../assets/images/logo-novyse.png",
  },
  linux: {
    category: "Network",
    target: ["AppImage"],
    icon: "../assets/images/logo-novyse.png",
  },
};
