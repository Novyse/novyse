import { Platform } from 'react-native';
import { API_LINK } from '../../config';
import { setCurrentToken } from '../token-manager';

const API_URL = API_LINK + "/auth";

const logger = (message: string) => {
    console.log(`[Passkey Signin] ${message}`);
};

/**
 * Performs a complete Passkey signin process using discoverable credentials.
 */
export async function signInPasskey() {
    try {
        // 1. Request Challenge
        logger("⏳ Richiesta opzioni Accesso Passkey...");
        const optionsRes = await fetch(`${API_URL}/signin/passkey/challenge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        
        const options = await optionsRes.json();
        if (!optionsRes.ok) throw new Error(options.error || "Errore durante la challenge");

        let assertionResponse;

        if (Platform.OS === 'web') {
            const { startAuthentication } = require('@simplewebauthn/browser');
            logger("📱 In attesa di autenticazione (Web)...");
            assertionResponse = await startAuthentication({ optionsJSON: options });
        } else {
            const Passkey = require('react-native-passkey').default;
            logger("📱 In attesa di autenticazione (Mobile)...");
            assertionResponse = await Passkey.auth(options);
        }

        // 2. Complete Signin
        logger("⏳ Verifica accesso in corso...");
        const completeRes = await fetch(`${API_URL}/signin/passkey/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
                assertionResponse,
            }),
        });

        const completeData = await completeRes.json();
        if (!completeRes.ok) throw new Error(completeData.error || "Errore durante il completamento");

        logger("✅ Accesso Passkey riuscito!");
        if (completeData.token) {
            setCurrentToken(completeData.token);
        }
        
        return { success: true, data: completeData };
    } catch (err: any) {
        logger(`❌ Errore Signin Passkey: ${err.message}`);
        return { success: false, error: err.message };
    }
}
