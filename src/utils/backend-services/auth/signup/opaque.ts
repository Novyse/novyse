import * as opaque from "react-native-opaque";
import { authApi, OPAQUE_SERVER_IDENTITY } from "../../config";

const API_PATH = "/signup/opaque";

export async function signUpOpaque(
  username: string,
  password: string,
  name: string,
  gdpr: { tos: boolean; privacy: boolean; isOver16: boolean },
  turnstileToken: string,
) {
  try {
    await opaque.ready;

    // 1. Start Registration
    const { clientRegistrationState, registrationRequest } =
      opaque.client.startRegistration({
        password,
      });

    // 2. Send Registration Request to Server (Challenge)
    const challengeRes = await authApi.post(
      `${API_PATH}/challenge`,
      {
        username,
        registrationRequest,
        turnstileToken,
      },
      {
        withCredentials: true,
      },
    );

    const challengeData = challengeRes.data;
    const signupId = challengeData.signupId;
    const registrationResponse = challengeData.registrationResponse;

    if (!registrationResponse) {
      throw new Error("Registration response missing from server");
    }

    // 3. Finish Registration
    const { registrationRecord } = opaque.client.finishRegistration({
      password,
      clientRegistrationState,
      registrationResponse,
      identifiers: {
        server: OPAQUE_SERVER_IDENTITY,
      },
    });

    // 4. Complete Registration on Server
    const completeRes = await authApi.post(
      `${API_PATH}/complete`,
      {
        signupId,
        username,
        name,
        registrationRecord,
        privacyPolicyAccepted: gdpr.privacy,
        termsOfServiceAccepted: gdpr.tos,
        isOver16: gdpr.isOver16,
      },
      {
        withCredentials: true,
      },
    );

    const completeData = completeRes.data;

    return { success: true, data: completeData };
  } catch (err: any) {
    console.error("Signup OPAQUE error:", err);
    return { success: false, error: err.message };
  }
}
