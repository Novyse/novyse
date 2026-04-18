import { authApi } from "../../config";
import { getAuthToken } from "@/src/utils/backend-services/auth/token-manager";

/**
 * Authorizes a QR Code authentication session from a logged-in device.
 * @param token The session token from the QR code.
 */
export async function authenticateQRCode(token: string) {
  try {
    const userJwt = await getAuthToken();
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
