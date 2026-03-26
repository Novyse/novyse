import {
  OpaqueClient,
  getOpaqueConfig,
  OpaqueID,
  KE2,
} from "@cloudflare/opaque-ts";
import { authApi } from "../../config";
import { setCurrentToken } from "../token-manager";

const API_PATH = "/auth/signin/opaque";


export async function signInOpaque(
  username: string,
  password: string,
  turnstileToken: string,
) {
  try {
    const cfg = getOpaqueConfig(OpaqueID.OPAQUE_P256);
    const client = new OpaqueClient(cfg);

    const authRequest = await client.authInit(password);
    if (authRequest instanceof Error) throw authRequest;

    const loginRequestBytes = Uint8Array.from(authRequest.serialize());
    const loginRequestB64 = btoa(String.fromCharCode(...loginRequestBytes));

    const bodyPayload = {
      username, 
      ke1: loginRequestB64,
      turnstileToken,
    };

    const challengeRes = await authApi.post(`${API_PATH}/challenge`, bodyPayload, {
      withCredentials: true,
    });

    const challengeData = challengeRes.data;
    const challengeId = challengeData.challengeId;

    const ke2B64 = challengeData.ke2;

    if (!ke2B64) throw new Error("(KE2) missing response from server");

    const ke2Bytes = new Uint8Array(
      atob(ke2B64)
        .split("")
        .map((c) => c.charCodeAt(0)),
    );
    const ke2 = KE2.deserialize(cfg, Array.from(ke2Bytes));

    const finish = await client.authFinish(ke2, "novyse-auth-service");
    if (finish instanceof Error) throw finish;

    const ke3Bytes = Uint8Array.from(finish.ke3.serialize());

    const completeRes = await authApi.post(`${API_PATH}/complete`, {
      challengeId,
      ke3: btoa(String.fromCharCode(...ke3Bytes)),
    }, {
      withCredentials: true,
    });

    const completeData = completeRes.data;

    if (completeData.requires2FA) {
      // Returning the status so the UI can handle the 2FA flow
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
    return { success: false, error: err.message };
  }
}
