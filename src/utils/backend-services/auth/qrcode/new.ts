import { API_LINK } from '../../config';

const API_URL = API_LINK + "/auth";

/**
 * Initializes a new QR Code authentication session.
 * @returns { token, expiresAt }
 */
export async function newQRCodeAuth() {
    try {
        const response = await fetch(`${API_URL}/signin/qrcode/new`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to initialize QR auth");
        
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
