import { authApi } from "@/src/utils/backend-services/config";
import InternalPlatform from "@/src/utils/device/type";
import { setCurrentToken } from "@/src/utils/backend-services/auth/token-manager";
import { performPasskeyAuthentication } from "@/src/utils/backend-services/auth/lib/passkey";

const API_PATH = "/signin/passkey";

export async function signInPasskey(turnstileToken: string) {
  try {
    const optionsRes = await authApi.post(`${API_PATH}/challenge`, { turnstileToken }, {
      headers: {
        "x-platform": InternalPlatform,
      },
    });
    const options = optionsRes.data;


    const assertionResponse = await performPasskeyAuthentication(options);

    const completeRes = await authApi.post(`${API_PATH}/complete`, {
      assertionResponse,
    }, {
      withCredentials: true,
      headers: {
        "x-platform": InternalPlatform,
      },
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
