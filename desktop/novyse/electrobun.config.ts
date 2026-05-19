import type { ElectrobunConfig } from "electrobun";
import appConfig, { BRANCH } from "../../app.config";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const name = capitalize(appConfig.expo.name);
const identifier =
  "com.novyse.desktop" +
  (BRANCH === "development" ? ".dev" : BRANCH === "preview" ? ".preview" : "");
const version = appConfig.expo.version;

export default {
  app: {
    name: name,
    identifier: identifier,
    version: version,
  },
  build: {
    copy: {
      "../../dist": "views/mainview",
    },
    mac: {
      bundleCEF: false,
    },
    linux: {
      bundleCEF: false,
      icon: "../../assets/images/novyse-icon-logo.png",
    },
    win: {
      bundleCEF: false,
      icon: "../../assets/images/novyse-icon-logo.png",
    },
  },
} satisfies ElectrobunConfig;
