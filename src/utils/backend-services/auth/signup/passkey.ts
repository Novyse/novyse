import { authApi } from "@/src/utils/backend-services/config";
import InternalPlatform from "@/src/utils/device/type";
import { setCurrentToken } from "@/src/utils/backend-services/auth/token-manager";
import { performPasskeyRegistration } from "@/src/utils/backend-services/auth/lib/passkey";

const API_PATH = "/signup/passkey";

export async function signUpPasskey(
  handle: string,
  name: string,
  gdpr: { tos: boolean; privacy: boolean; isOver16: boolean },
  turnstileToken: string,
) {
  try {
    const optionsRes = await authApi.post(
      `${API_PATH}/challenge`,
      { username: handle, turnstileToken },
      {
        headers: {
          "x-platform": InternalPlatform,
        },
      },
    );
    const options = optionsRes.data;

    const registrationResponse = await performPasskeyRegistration(options);

    const completeRes = await authApi.post(
      `${API_PATH}/complete`,
      {
        username: handle,
        name: name,
        registrationResponse,
        privacyPolicyAccepted: gdpr.privacy,
        termsOfServiceAccepted: gdpr.tos,
        isOver16: gdpr.isOver16,
      },
      {
        headers: {
          "x-platform": InternalPlatform,
        },
      },
    );

    const completeData = completeRes.data;

    if (completeData.token) {
      setCurrentToken(completeData.token);
    }

    return { success: true, data: completeData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
