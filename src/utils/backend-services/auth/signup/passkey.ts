import { Platform } from 'react-native';
import { API_LINK } from '../../config';
import { setCurrentToken } from '../token-manager';

const API_URL = API_LINK + "/auth";

const logger = (message: string) => {
    console.log(`[Passkey Signup] ${message}`);
};

/**
 * Performs a complete Passkey signup process.
 * 
 * @param handle The user's handle/username.
 * @param name The user's display name.
 */
export async function signUpPasskey(handle: string, name: string) {
    try {
        // 1. Request Challenge
        logger("⏳ Richiesta opzioni Registrazione Passkey...");
        const optionsRes = await fetch(`${API_URL}/signup/passkey/challenge`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: handle }),
        });
        
        const options = await optionsRes.json();
        if (!optionsRes.ok) throw new Error(options.error || "Errore durante la challenge");

        let registrationResponse;

        if (Platform.OS === 'web') {
            const { startRegistration } = require('@simplewebauthn/browser');
            logger("📱 In attesa del dispositivo (Web)...");
            registrationResponse = await startRegistration({ optionsJSON: options });
        } else {
            const Passkey = require('react-native-passkey').default;
            logger("📱 In attesa del dispositivo (Mobile)...");
            // react-native-passkey expects the options object
            registrationResponse = await Passkey.register(options);
        }

        // 2. Complete Registration
        logger("⏳ Verifica e creazione account in corso...");
        const completeRes = await fetch(`${API_URL}/signup/passkey/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: handle,
                name: name,
                registrationResponse,
                privacyPolicyAccepted: true,
                termsOfServiceAccepted: true,
            }),
        });

        const completeData = await completeRes.json();
        if (!completeRes.ok) throw new Error(completeData.error || "Errore durante il completamento");

        logger("✅ Registrazione Passkey riuscita!");
        if (completeData.token) {
            setCurrentToken(completeData.token);
        }
        
        return { success: true, data: completeData };
    } catch (err: any) {
        logger(`❌ Errore Signup Passkey: ${err.message}`);
        return { success: false, error: err.message };
    }
}
