import { authApi } from "../../config";
import { setCurrentToken } from "../token-manager";
import { performPasskeyRegistration } from "../lib/passkey";

const API_PATH = "/auth/signup/passkey";

export async function signUpPasskey(
  handle: string,
  name: string,
  turnstileToken: string,
) {
  try {
    const optionsRes = await authApi.post(`${API_PATH}/challenge`, { username: handle, turnstileToken });
    const options = optionsRes.data;


    const registrationResponse = await performPasskeyRegistration(options);

    const completeRes = await authApi.post(`${API_PATH}/complete`, {
        username: handle,
        name: name,
        registrationResponse,
        privacyPolicyAccepted: true,
        termsOfServiceAccepted: true,
    });

    const completeData = completeRes.data;

    if (completeData.token) {
      setCurrentToken(completeData.token);
    }

    return { success: true, data: completeData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
