import { Platform } from "react-native";
import { API_LINK } from "../../config";
import { setCurrentToken } from "../token-manager";

const API_URL = API_LINK + "/auth";

export async function signInPasskey(turnstileToken: string) {
  try {
    const optionsRes = await fetch(`${API_URL}/signin/passkey/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turnstileToken }),
    });

    const options = await optionsRes.json();
    if (!optionsRes.ok) throw new Error(options.error);

    let assertionResponse;

    if (Platform.OS === "web") {
      const { startAuthentication } = require("@simplewebauthn/browser");
      assertionResponse = await startAuthentication({ optionsJSON: options });
    } else {
      const Passkey = require("react-native-passkey").default;
      assertionResponse = await Passkey.auth(options);
    }

    const completeRes = await fetch(`${API_URL}/signin/passkey/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        assertionResponse,
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
