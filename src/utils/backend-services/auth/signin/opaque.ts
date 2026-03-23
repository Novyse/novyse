import {
  OpaqueClient,
  getOpaqueConfig,
  OpaqueID,
  KE2,
} from "@cloudflare/opaque-ts";
import { setCurrentToken } from "../token-manager";
import { API_LINK } from "../../config";

const API_URL = API_LINK + "/auth";

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
      loginRequest: loginRequestB64,
      ke1: loginRequestB64,
      authRequest: loginRequestB64,
      turnstileToken,
    };

    const challengeRes = await fetch(`${API_URL}/signin/opaque/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyPayload),
      credentials: "include",
    });

    const challengeText = await challengeRes.text();
    const challengeData = challengeText ? JSON.parse(challengeText) : {};

    if (!challengeRes.ok)
      throw new Error(challengeData.error || `HTTP ${challengeRes.status}`);

    const ke2B64 =
      challengeData.ke2 ??
      challengeData.authResponse ??
      challengeData.loginResponse;

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

    const completeRes = await fetch(`${API_URL}/signin/opaque/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        username,
        ke3: btoa(String.fromCharCode(...ke3Bytes)),
      }),
    });

    const completeData = await completeRes.json();
    if (!completeRes.ok) throw new Error(completeData.error);

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
