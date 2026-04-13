import * as opaque from "react-native-opaque";
import { authApi, OPAQUE_SERVER_IDENTITY } from "../../config";
import { setCurrentToken } from "../token-manager";

const API_PATH = "/signin/opaque";

export async function signInOpaque(
  username: string,
  password: string,
  turnstileToken: string,
) {
  try {
    await opaque.ready;

    // 1. Start Login
    const { clientLoginState, startLoginRequest } = opaque.client.startLogin({
      password,
    });

    // 2. Send Login Request (KE1) to Server (Challenge)
    const challengeRes = await authApi.post(
      `${API_PATH}/challenge`,
      {
        username,
        ke1: startLoginRequest,
        turnstileToken,
      },
      {
        withCredentials: true,
      },
    );

    const challengeData = challengeRes.data;
    const challengeId = challengeData.challengeId;
    const ke2 = challengeData.ke2;

    if (!ke2) throw new Error("(KE2) missing response from server");

    // 3. Finish Login (KE3)
    const finishLoginResult = opaque.client.finishLogin({
      clientLoginState,
      loginResponse: ke2,
      password,
      identifiers: {
        server: OPAQUE_SERVER_IDENTITY,
      },
    });

    if (!finishLoginResult) {
      throw new Error("Failed to finish login");
    }

    const { finishLoginRequest } = finishLoginResult;

    // 4. Complete Login on Server
    const completeRes = await authApi.post(
      `${API_PATH}/complete`,
      {
        challengeId,
        ke3: finishLoginRequest,
      },
      {
        withCredentials: true,
      },
    );

    const completeData = completeRes.data;

    if (completeData.requires2FA) {
      return {
        success: true,
        requires2FA: true,
        twoFactorToken: completeData.twoFactorToken,
      };
    } else {
      setCurrentToken(completeData.token);
      return { success: true, requires2FA: false, data: completeData };
    }
  } catch (err: any) {
    console.error("Signin OPAQUE error:", err);
    return { success: false, error: err.message };
  }
}
