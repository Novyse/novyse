//.ENV
const APP_NAME = "Novyse"; // Novyse-dev Novyse
const APP_NAME_LOWERCASE = "novyse";
const APP_SLUG = "novyse";
const APP_VERSION = "0.8";
const BUILD_NUMBER = "1";
const BUILD_DATE = "2025/10/01 16:21:47";
const EXPO_OWNER = "novyse";
const EAS_PROJECT_ID = "3f91b058-96c7-45ff-abb5-511b5d084b64";
const API_BASE_URL = "https://api.novyse.com";
const SOCKET_BASE_URL = "wss://io.novyse.com";
const BRANCH = "preview";
//.ENV

export {
  BRANCH,
  API_BASE_URL,
  SOCKET_BASE_URL,
  APP_VERSION,
  BUILD_NUMBER,
  BUILD_DATE,
};

// Genera suffisso per dev mode
const getDevSuffix = () => {
  const branch = BRANCH || "main";
  return branch === "development" ? ".dev" : "";
};

// Genera il percorso base delle immagini in base al BRANCH
const getImagePath = (imageName) => {
  const branch = BRANCH || "main";
  const name = imageName ? `-${imageName}` : "";
  const basePath =
    branch === "development"
      ? `./assets/images/development/logo-${APP_NAME_LOWERCASE}${name}.png`
      : `./assets/images/logo-${APP_NAME_LOWERCASE}${name}.png`;
  return basePath;
};

const devSuffix = getDevSuffix();

export default {
  expo: {
    name: `${APP_NAME}${devSuffix}`,
    slug: `${APP_SLUG}${devSuffix}`,
    version: APP_VERSION,
    orientation: "portrait",
    icon: getImagePath(),
    scheme: `${APP_SLUG}${devSuffix}`,
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
      intentFilters: [
        {
          action: "VIEW",
          data: {
            scheme: `${APP_SLUG}${devSuffix}`,
          },
          category: ["BROWSABLE", "DEFAULT"],
        },
        {
          action: "VIEW",
          data: {
            scheme: "https",
            host: "web.novyse.com",
            pathPrefix: "/",
          },
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: getImagePath(),
    },
    plugins: [
      "expo-router",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: getImagePath(),
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-sqlite",
      "expo-audio",
      "expo-video",
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
          microphonePermission:
            "Allow $(PRODUCT_NAME) to access your microphone",
          recordAudioAndroid: true,
        },
      ],
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
