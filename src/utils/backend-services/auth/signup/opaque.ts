import {
  OpaqueClient,
  getOpaqueConfig,
  OpaqueID,
  RegistrationResponse,
} from "@cloudflare/opaque-ts";
import { API_LINK } from "../../config";

const API_URL = API_LINK + "/auth";
/**
 * Simple logger wrapper to match the snippet's usage.
 */
const logger = (message: string) => {
    console.log(`[OPAQUE Signup] ${message}`);
};

/**
 * Performs a complete OPAQUE signup process in a single call.
 * This function coordinates the two-step registration protocol:
 * 1. Challenge: Client sends a RegistrationRequest, Server responds with a RegistrationResponse.
 * 2. Completion: Client sends a RegistrationRecord along with user profile metadata.
 *
 * @param username The unique identifier for the user (e.g., email or handle).
 * @param password The user's chosen password.
 * @param name The user's display name.
 * @param gdpr An object containing TOS and Privacy policy acceptance.
 */
export async function signUpOpaque(
    username: string,
    password: string,
    name: string,
    gdpr: { tos: boolean; privacy: boolean },
) {
    try {
        // 1. Initialize the OPAQUE client
        // OPAQUE-P256 is a common configuration for OPAQUE.
        const cfg = getOpaqueConfig(OpaqueID.OPAQUE_P256);
        const client = new OpaqueClient(cfg);

        // 2. Generate the Registration Request
        logger("⏳ Inizializzazione registrazione OPAQUE...");
        const registrationRequest = await client.registerInit(password);
        if (registrationRequest instanceof Error) throw registrationRequest;

        // 3. STEP 1: Request Challenge from the Hono endpoint
        logger("⏳ Invio Challenge OPAQUE...");
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
            }),
            credentials: "include",
        });

        const challengeData = await challengeRes.json();
        if (!challengeRes.ok) throw new Error(challengeData.error || "Errore durante la challenge");

        // 4. Process server response and finalize local registration
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

        // 5. STEP 2: Complete registration by sending the record + GDPR info
        logger("⏳ Completamento registrazione...");
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
        if (!completeRes.ok) throw new Error(completeData.error || "Errore durante il completamento");

        logger("✅ Registrazione completata con successo!");
        return { success: true, data: completeData };
    } catch (err: any) {
        logger(`❌ Errore: ${err.message}`);
        return { success: false, error: err.message };
    }
}
