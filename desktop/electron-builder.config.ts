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
  ],
  mac: {
    category: "public.app-category.social-networking",
    target: ["dmg"],
  },
  win: {
    target: ["nsis"],
  },
  linux: {
    category: "Network",
    target: ["AppImage"],
  },
};
