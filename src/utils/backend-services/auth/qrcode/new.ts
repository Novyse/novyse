import { authApi } from "../../config";

/**
 * Initializes a new QR Code authentication session.
 * @returns { token, expiresAt }
 */
export async function newQRCodeAuth() {
  try {
    const response = await authApi.post("/signin/qrcode/new");
    return { success: true, data: response.data };
  } catch (err: any) {
    return {
      success: false,
      error: err.response?.data?.message || err.message,
    };
  }
}
