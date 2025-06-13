import 'dotenv/config';

// Genera suffisso per dev mode
const getDevSuffix = () => {
  const branch = process.env.BRANCH || 'main';
  return branch === 'dev' ? '_dev' : '';
};

// Genera il percorso base delle immagini in base al BRANCH
const getImagePath = (imageName) => {
  const branch = process.env.BRANCH || 'main';
  const basePath = branch === 'dev' 
    ? `./assets/images/dev/logo-${process.env.APP_NAME_LOWERCASE}-${imageName}.png`
    : `./assets/images/logo-${process.env.APP_NAME_LOWERCASE}-${imageName}.png`;
  return basePath;
};

const devSuffix = getDevSuffix();

export default {
  expo: {
    name: `${process.env.APP_NAME}${devSuffix}`,
    slug: `${process.env.APP_SLUG}${devSuffix}`,
    version: process.env.APP_VERSION,
    orientation: "portrait",
    icon: getImagePath('bg'),
    scheme: `com.${process.env.APP_SLUG}${devSuffix}`,
    owner: process.env.EXPO_OWNER,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: `com.${process.env.APP_SLUG}${devSuffix}`,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: getImagePath('bg'),
        backgroundColor: "#ffffff"
      },
      package: `com.${process.env.APP_SLUG}${devSuffix}`
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: getImagePath('nobg-zoom')
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: getImagePath('bg'),
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        }
      ],
      "expo-sqlite",
      "expo-audio"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      }
    }
  }
};