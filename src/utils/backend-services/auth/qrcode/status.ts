import { authApi } from "../../config";

/**
 * Polls the status of a QR Code authentication session.
 * @param token The session token.
 * @returns { status: 'AUTHORIZED' | 'PENDING', token?: 'NEW_JWT', ... }
 */
export async function getQRCodeStatus(token: string) {
  try {
    const response = await authApi.get(`/signin/qrcode/status/${token}`);
    return { success: true, data: response.data };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.message || err.message,
    };
  }
}
