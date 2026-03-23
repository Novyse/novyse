import { Platform } from "react-native";
import { API_LINK } from "../../config";
import { setCurrentToken } from "../token-manager";

const API_URL = API_LINK + "/auth";

export async function signUpPasskey(
  handle: string,
  name: string,
  turnstileToken: string,
) {
  try {
    const optionsRes = await fetch(`${API_URL}/signup/passkey/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: handle, turnstileToken }),
    });

    const options = await optionsRes.json();
    if (!optionsRes.ok) throw new Error(options.error);

    let registrationResponse;

    if (Platform.OS === "web") {
      const { startRegistration } = require("@simplewebauthn/browser");
      registrationResponse = await startRegistration({ optionsJSON: options });
    } else {
      const Passkey = require("react-native-passkey").default;
      registrationResponse = await Passkey.register(options);
    }

    const completeRes = await fetch(`${API_URL}/signup/passkey/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: handle,
        name: name,
        registrationResponse,
        privacyPolicyAccepted: true,
        termsOfServiceAccepted: true,
      }),
    });

    const completeData = await completeRes.json();
    if (!completeRes.ok) throw new Error(completeData.error);

    if (completeData.token) {
      setCurrentToken(completeData.token);
    }

    return { success: true, data: completeData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
