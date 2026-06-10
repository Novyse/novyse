import "react-native-get-random-values";
import "./src/utils/notifications/manager";
const { LoadSkiaWeb } = require("@shopify/react-native-skia/lib/module/web");
LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(() => {
  require("expo-router/entry");
});
