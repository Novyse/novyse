import { API_LINK } from '../../config';

const API_URL = API_LINK + "/auth";

/**
 * Polls the status of a QR Code authentication session.
 * @param token The session token.
 * @returns { status: 'AUTHORIZED' | 'PENDING', token?: 'NEW_JWT', ... }
 */
export async function getQRCodeStatus(token: string) {
    try {
        const response = await fetch(`${API_URL}/signin/qrcode/status/${token}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch QR status");
        
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
