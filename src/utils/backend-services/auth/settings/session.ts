import { authApi } from "../../config";
import { getAuthToken } from "../token-manager";

const API_PATH = "/auth/session";

export const session = {
  /**
   * Get current session info
   */
  async getCurrent() {
    try {
      const token = await getAuthToken();
      const response = await authApi.get(API_PATH, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, data: response.data.session };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  /**
   * List all user sessions
   */
  async list() {
    try {
      const token = await getAuthToken();
      const response = await authApi.get(`${API_PATH}/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, data: response.data.sessions };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  /**
   * Revoke a specific session
   */
  async revoke(sessionID: number) {
    try {
      const token = await getAuthToken();
      const response = await authApi.post(`${API_PATH}/revoke`, { id: sessionID }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  /**
   * Revoke all other sessions
   */
  async revokeOther() {
    try {
      const token = await getAuthToken();
      const response = await authApi.post(`${API_PATH}/revokeOther`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }
};
