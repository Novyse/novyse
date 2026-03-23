import { authApi } from "../../config";
import { getAuthToken } from "../token-manager";

const API_PATH = `/auth/settings/opaque`;

export const opaque = {
  /**
   * Check if OPAQUE password is setup
   */
  async getStatus() {
    try {
      const token = await getAuthToken();
      const response = await authApi.get(`${API_PATH}/status`, {
        headers: { Authorization: `Bearer ${token}` },
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
   * Start password setup/change challenge
   */
  async setupChallenge(registrationRequest: string) {
    try {
      const token = await getAuthToken();
      const response = await authApi.post(
        `${API_PATH}/setup/challenge`,
        { registrationRequest },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  /**
   * Complete password setup/change
   */
  async setupComplete(registrationRecord: string) {
    try {
      const token = await getAuthToken();
      const response = await authApi.post(
        `${API_PATH}/setup/complete`,
        { registrationRecord },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  /**
   * Deactivate password login
   */
  async deactivate() {
    try {
      const token = await getAuthToken();
      const response = await authApi.post(
        `${API_PATH}/deactivate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },
};
