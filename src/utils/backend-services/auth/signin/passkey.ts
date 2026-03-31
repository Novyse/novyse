import { authApi } from "../../config";
import { setCurrentToken } from "../token-manager";
import { performPasskeyAuthentication } from "../lib/passkey";

const API_PATH = "/auth/signin/passkey";

export async function signInPasskey(turnstileToken: string) {
  try {
    const optionsRes = await authApi.post(`${API_PATH}/challenge`, { turnstileToken });
    const options = optionsRes.data;


    const assertionResponse = await performPasskeyAuthentication(options);

    const completeRes = await authApi.post(`${API_PATH}/complete`, {
      assertionResponse,
    }, {
      withCredentials: true,
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
