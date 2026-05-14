//.ENV
const APP_NAME = "Novyse"; // Novyse-dev Novyse
const APP_SLUG = "novyse";
const APP_VERSION = "1.0.0";
const BUILD_NUMBER = "1";
const BUILD_DATE = "2026/05/14 13:00:00";
const EXPO_OWNER = "novyse";
const EAS_PROJECT_ID = "3f91b058-96c7-45ff-abb5-511b5d084b64";
const BRANCH = "development" as "development" | "preview" | "production";

const getDomain = (sub: string) => {
  const suffix =
    BRANCH === "production" ? "" : BRANCH === "preview" ? ".preview" : ".dev";
  return `${sub}${suffix}.novyse.com`;
};

const API_BASE = getDomain("api");
const SOCKET_BASE_URL = `wss://${getDomain("io")}`;
const WEB_BASE = getDomain("web");
const AUTH_BASE = getDomain("auth");
const API_BASE_URL = `https://${API_BASE}`;
const AUTH_BASE_URL = `https://${AUTH_BASE}`;

const APP_URL =
  BRANCH === "development"
    ? "http://localhost:8081"
    : BRANCH === "preview"
      ? "https://preview.novyse.com"
      : "https://web.novyse.com";

const TINY_APP_URL = "https://vyse.me";
const LANDING_PAGE_URL = "https://www.novyse.com";
const PRIVACY_POLICY_URL = `${LANDING_PAGE_URL}/legal/privacy-policy`;
const TOS_URL = `${LANDING_PAGE_URL}/legal/terms-of-service`;
const CLOUDFLARE_TURNSTILE_PUBLIC = "0x4AAAAAACvBX17HadrEqUCS";
//.ENV

export {
  BRANCH,
  AUTH_BASE_URL,
  API_BASE_URL,
  SOCKET_BASE_URL,
  APP_VERSION,
  BUILD_NUMBER,
  BUILD_DATE,
  APP_URL,
  TINY_APP_URL,
  LANDING_PAGE_URL,
  PRIVACY_POLICY_URL,
  TOS_URL,
  CLOUDFLARE_TURNSTILE_PUBLIC,
};

// Genera suffisso per dev mode
const getDevSuffix = () => {
  const branch = BRANCH || "main";
  if (branch === "development") return ".dev";
  if (branch === "preview") return ".preview";
  return "";
};

const devSuffix = getDevSuffix();

export default {
  expo: {
    name: `${APP_NAME}${devSuffix}`,
    slug: APP_SLUG,
    version: APP_VERSION,
    orientation: "portrait",
    icon: "./assets/images/novyse-icon-logo.png",
    scheme: `${APP_SLUG}${devSuffix}`,
    owner: EXPO_OWNER,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: `com.${APP_SLUG}${devSuffix}`,
      associatedDomains: [
        `webcredentials:${AUTH_BASE}`,
        `applinks:${AUTH_BASE}`,
        `applinks:${WEB_BASE}`,
      ],
      infoPlist: {
        UIBackgroundModes: ["audio"],
      },
      googleServicesFile: "./GoogleService-Info.plist",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/novyse-icon-logo.png",
        backgroundColor: "#ffffff",
      },
      package: `com.${APP_SLUG}${devSuffix}`,
      softwareKeyboardLayoutMode: "pan",
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
          autoVerify: true,
          data: {
            scheme: "https",
            host: AUTH_BASE,
          },
          category: ["BROWSABLE", "DEFAULT"],
        },
        {
          action: "VIEW",
          autoVerify: true,
          data: {
            scheme: "https",
            host: WEB_BASE,
          },
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      permissions: [
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_MEDIA_PROJECTION",
        "WAKE_LOCK",
        "USE_FULL_SCREEN_INTENT",
        "VIBRATE",
      ],
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
      title: APP_NAME,
    },
    plugins: [
      [
        "./plugins/withAndroidNotificationIcon",
        {
          iconName: "assets/images/notification_icon.png",
        },
      ],
      "@react-native-firebase/app",
      "expo-router",
      "expo-asset",
      "expo-web-browser",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/novyse-icon-logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      [
        "expo-sqlite",
        {
          useSQLCipher: true,
        },
      ],
      [
        "expo-audio",
        {
          microphonePermission:
            "Allow $(PRODUCT_NAME) to access your microphone.",
          enableBackgroundPlayback: true,
        },
      ],
      [
        "expo-video",
        {
          supportsBackgroundPlayback: true,
          supportsPictureInPicture: true,
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
          microphonePermission:
            "Allow $(PRODUCT_NAME) to access your microphone",
          recordAudioAndroid: true,
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "The app accesses your photos to let you share them with your friends.",
        },
      ],
      [
        "react-native-audio-api",
        {
          iosBackgroundMode: true,
          iosMicrophonePermission:
            "This app requires access to the microphone to record audio.",
          androidPermissions: ["android.permission.MODIFY_AUDIO_SETTINGS"],
          androidForegroundService: true,
          androidFSTypes: ["mediaPlayback"],
        },
      ],
      "@livekit/react-native-expo-plugin",
      [
        "expo-share-intent",
        {
          iosActivationRules: {
            NSExtensionActivationSupportsText: true,
            NSExtensionActivationSupportsWebURLWithMaxCount: 1,
            NSExtensionActivationSupportsWebPageWithMaxCount: 1,
            NSExtensionActivationSupportsImageWithMaxCount: 5,
            NSExtensionActivationSupportsMovieWithMaxCount: 5,
            NSExtensionActivationSupportsFileWithMaxCount: 5,
          },
          androidIntentFilters: ["*/*"],
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
