import { authApi } from "@/src/utils/backend-services/config";
import InternalPlatform from "@/src/utils/device/type";
import { getAuthToken } from "@/src/utils/backend-services/auth/token-manager";
import { performPasskeyRegistration } from "@/src/utils/backend-services/auth/lib/passkey";

const API_PATH = `/settings/passkey`;

export const passkey = {
  /**
   * List all user's passkeys
   */
  async list() {
    try {
      const token = await getAuthToken();
      const response = await authApi.get(API_PATH, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-platform": InternalPlatform,
        },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  /**
   * Add a new passkey
   */
  async add() {
    try {
      const token = await getAuthToken();

      // 1. Get challenge
      const challengeRes = await authApi.post(
        `${API_PATH}/add/challenge`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-platform": InternalPlatform,
          },
        },
      );
      const options = challengeRes.data;

      const registrationResponse = await performPasskeyRegistration(options);

      // 3. Complete registration
      const completeRes = await authApi.post(
        `${API_PATH}/add/complete`,
        { registrationResponse },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-platform": InternalPlatform,
          },
        },
      );

      return { success: true, data: completeRes.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  /**
   * Remove a passkey by UUID
   */
  async remove(id: string) {
    try {
      const token = await getAuthToken();
      const response = await authApi.delete(`${API_PATH}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-platform": InternalPlatform,
        },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },
};

