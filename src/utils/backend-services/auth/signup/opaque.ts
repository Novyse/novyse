import {
  OpaqueClient,
  getOpaqueConfig,
  OpaqueID,
  RegistrationResponse,
} from "@cloudflare/opaque-ts";
import { authApi } from "../../config";

const API_PATH = "/auth/signup/opaque";


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

    const challengeRes = await authApi.post(`${API_PATH}/challenge`, {
      username,
      registrationRequest: btoa(
        String.fromCharCode(...registrationRequestBytes),
      ),
      turnstileToken,
    }, {
      withCredentials: true,
    });

    const challengeData = challengeRes.data;

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

    const completeRes = await authApi.post(`${API_PATH}/complete`, {
      username,
      name,
      registrationRecord: btoa(
        String.fromCharCode(...registrationRecordBytes),
      ),
      privacyPolicyAccepted: gdpr.privacy,
      termsOfServiceAccepted: gdpr.tos,
    }, {
      withCredentials: true,
    });

    const completeData = completeRes.data;

    return { success: true, data: completeData };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
