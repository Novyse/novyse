import { API_LINK } from '../../config';

const API_URL = API_LINK + "/auth";

/**
 * Authorizes a QR Code authentication session from a logged-in device.
 * @param token The session token from the QR code.
 * @param userJwt The current logged-in user's JWT.
 */
export async function authenticateQRCode(token: string, userJwt: string) {
    try {
        const response = await fetch(`${API_URL}/signin/qrcode/authenticate/${token}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${userJwt}`
            },
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to authorize device");
        
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
