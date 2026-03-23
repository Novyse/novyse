import {
  OpaqueClient,
  getOpaqueConfig,
  OpaqueID,
  RegistrationResponse,
} from "@cloudflare/opaque-ts";
import { API_LINK } from "../../config";

const API_URL = API_LINK + "/auth";

export async function signUpOpaque(
  username: string,
  password: string,
  name: string,
  gdpr: { tos: boolean; privacy: boolean },
  turnstileToken: string,
) {
  try {
    const cfg = getOpaqueConfig(OpaqueID.OPAQUE_P256);
    const client = new OpaqueClient(cfg);

    const registrationRequest = await client.registerInit(password);
    if (registrationRequest instanceof Error) throw registrationRequest;

    const registrationRequestBytes = Uint8Array.from(
      registrationRequest.serialize(),
    );

    const challengeRes = await fetch(`${API_URL}/signup/opaque/challenge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        registrationRequest: btoa(
          String.fromCharCode(...registrationRequestBytes),
        ),
        turnstileToken,
      }),
      credentials: "include",
    });

    const challengeData = await challengeRes.json();
    if (!challengeRes.ok) throw new Error(challengeData.error);

    const registrationResponseBytes = new Uint8Array(
      atob(challengeData.registrationResponse)
        .split("")
        .map((c) => c.charCodeAt(0)),
    );

    const opaqueRegistrationResponse = RegistrationResponse.deserialize(
      cfg,
      Array.from(registrationResponseBytes),
    );

    const registrationFinish = await client.registerFinish(
      opaqueRegistrationResponse,
      "novyse-auth-service",
    );
    if (registrationFinish instanceof Error) throw registrationFinish;

    const registrationRecordBytes = Uint8Array.from(
      registrationFinish.record.serialize(),
    );

    const completeRes = await fetch(`${API_URL}/signup/opaque/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        name,
        registrationRecord: btoa(
          String.fromCharCode(...registrationRecordBytes),
        ),
        privacyPolicyAccepted: gdpr.privacy,
        termsOfServiceAccepted: gdpr.tos,
      }),
      credentials: "include",
    });

    const completeData = await completeRes.json();
    if (!completeRes.ok) throw new Error(completeData.error);

    return { success: true, data: completeData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
