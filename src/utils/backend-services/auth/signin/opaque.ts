import {
  OpaqueClient,
  getOpaqueConfig,
  OpaqueID,
  RegistrationResponse,
  KE2,
} from "@cloudflare/opaque-ts";
import { setCurrentToken } from "../token-manager";
import { API_LINK } from "../../config";

const API_URL = API_LINK + "/auth";

const logger = (message: string) => {
  console.log(`[OPAQUE Signin] ${message}`);
};

/**
 * Performs a complete OPAQUE signin process in a single call.
 * This function coordinates the two-step authentication protocol:
 * 1. Challenge: Client sends a KeX (Key Exchange) request, Server responds with KE2 (authResponse).
 * 2. Completion: Client sends KE3 (finalization) to complete the exchange and obtain a session.
 *
 * @param username The unique identifier for the user.
 * @param password The user's password.
 */
export async function signInOpaque(username: string, password: string) {
  try {
    // 1. Initialize the OPAQUE client
    const cfg = getOpaqueConfig(OpaqueID.OPAQUE_P256);
    const client = new OpaqueClient(cfg);

    // 2. Generate the KeX (Key Exchange) Request
    const authRequest = await client.authInit(password);
    if (authRequest instanceof Error) throw authRequest;

    // 3. STEP 1: Request Challenge from the server
    logger("⏳ Invio richiesta di login (Challenge)...");
    const loginRequestBytes = Uint8Array.from(authRequest.serialize());
    const loginRequestB64 = btoa(String.fromCharCode(...loginRequestBytes));

    // Send with multiple aliases for endpoint compatibility as in the snippet
    const bodyPayload = {
      username,
      loginRequest: loginRequestB64,
      ke1: loginRequestB64,
      authRequest: loginRequestB64,
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

    // 4. Process server response (KE2)
    const ke2B64 =
      challengeData.ke2 ??
      challengeData.authResponse ??
      challengeData.loginResponse;

    if (!ke2B64) throw new Error("Response mancante dal server (KE2)");

    const ke2Bytes = new Uint8Array(
      atob(ke2B64)
        .split("")
        .map((c) => c.charCodeAt(0)),
    );
    const ke2 = KE2.deserialize(cfg, Array.from(ke2Bytes));

    // Client generates the finalization message (KE3)
    const finish = await client.authFinish(ke2, "novyse-auth-service");
    if (finish instanceof Error) throw finish;

    // 5. STEP 2: Send Finalization (KE3) to complete the login
    logger("⏳ Verifica finale in corso...");
    const ke3Bytes = Uint8Array.from(finish.ke3.serialize());

    const completeRes = await fetch(`${API_URL}/signin/opaque/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Essential for cross-site cookies
      body: JSON.stringify({
        username,
        ke3: btoa(String.fromCharCode(...ke3Bytes)),
      }),
    });

    const completeData = await completeRes.json();
    if (!completeRes.ok)
      throw new Error(completeData.error || "Errore durante il completamento");

    // 6. Handle Result
    if (completeData.requires2FA) {
      logger("⚠️ 2FA Richiesta! Inserisci il codice.");
      // Returning the status so the UI can handle the 2FA flow
      return {
        success: true,
        requires2FA: true,
        twoFactorToken: completeData.twoFactorToken,
      };
    } else {
      logger("✅ Login OPAQUE riuscito!");

      setCurrentToken(completeData.token);

      return { success: true, requires2FA: false, data: completeData };
    }
  } catch (err: any) {
    logger(`❌ Errore Login: ${err.message}`);
    return { success: false, error: err.message };
  }
}
