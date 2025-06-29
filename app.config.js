//.ENV
const APP_NAME = "Novyse"; // Novyse-dev Novyse
const APP_NAME_LOWERCASE = "novyse";
const APP_SLUG = "novyse";
const APP_VERSION = "0.0.7.2";
const EXPO_OWNER = "novyse";
const EAS_PROJECT_ID = "6f29bfad-6db3-491f-9bbf-d97664dac861";
const API_BASE_URL = "https://api.novyse.com";
const IO_BASE_URL = "wss://io.novyse.com";
const BRANCH = "dev";
//.ENV

export { BRANCH, API_BASE_URL, IO_BASE_URL, APP_VERSION, };

// Genera suffisso per dev mode
const getDevSuffix = () => {
  const branch = BRANCH || "main";
  return branch === "dev" ? "_dev" : "";
};

// Genera il percorso base delle immagini in base al BRANCH
const getImagePath = (imageName) => {
  const branch = BRANCH || "main";
  const basePath =
    branch === "dev"
      ? `./assets/images/dev/logo-${APP_NAME_LOWERCASE}-${imageName}.png`
      : `./assets/images/logo-${APP_NAME_LOWERCASE}-${imageName}.png`;
  return basePath;
};

const devSuffix = getDevSuffix();

export default {
  expo: {
    name: `${APP_NAME}${devSuffix}`,
    slug: `${APP_SLUG}${devSuffix}`,
    version: APP_VERSION,
    orientation: "portrait",
    icon: getImagePath("bg"),
    scheme: `com.${APP_SLUG}${devSuffix}`,
    owner: EXPO_OWNER,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: `com.${APP_SLUG}${devSuffix}`,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: getImagePath("bg"),
        backgroundColor: "#ffffff",
      },
      package: `com.${APP_SLUG}${devSuffix}`,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: getImagePath("nobg-zoom"),
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: getImagePath("bg"),
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-sqlite",
      "expo-audio",
      "expo-video",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
  },
};
