import { authApi } from "../../config";

/**
 * Authorizes a QR Code authentication session from a logged-in device.
 * @param token The session token from the QR code.
 * @param userJwt The current logged-in user's JWT.
 */
export async function authenticateQRCode(token: string, userJwt: string) {
  try {
    const response = await authApi.post(
      `/signin/qrcode/authenticate/${token}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${userJwt}`,
        },
      },
    );

    return { success: true, data: response.data };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.message || err.message,
    };
  }
}
