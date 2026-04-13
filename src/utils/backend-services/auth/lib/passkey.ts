import { Platform } from "react-native";
/**
 * Handle passkey registration (creation)
 */
export async function performPasskeyRegistration(options: any) {
  if (Platform.OS === "web") {
    const { startRegistration } = require("@simplewebauthn/browser");
    return await startRegistration({ optionsJSON: options });
  } else {
    const { Passkey } = require("react-native-passkey");
    return await Passkey.create(options);
  }
}

/**
 * Handle passkey authentication (login)
 */
export async function performPasskeyAuthentication(options: any) {
  if (Platform.OS === "web") {
    const { startAuthentication } = require("@simplewebauthn/browser");
    return await startAuthentication({ optionsJSON: options });
  } else {
    const { Passkey } = require("react-native-passkey");
    return await Passkey.get(options);
  }
}
