import { authApi } from "../config";
import { getAuthToken } from "./token-manager";

const API_PATH = `/auth/apikey`;

export const apikey = {
  /**
   * List all user's API keys
   */
  async list() {
    try {
      const token = await getAuthToken();
      const response = await authApi.get(API_PATH, {
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
   * Create a new API key
   */
  async create(
    name: string,
    permissions: object = {},
    expiresIn: string | number = -1,
  ) {
    try {
      const token = await getAuthToken();
      const response = await authApi.post(
        API_PATH,
        { name, permissions, expiresIn },
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
   * Toggle API key active status
   */
  async toggleActive(id: number, active: boolean) {
    try {
      const token = await getAuthToken();
      const response = await authApi.patch(
        `${API_PATH}/${id}`,
        { active },
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
   * Revoke an API key by ID
   */

  async revoke(id: number) {
    try {
      const token = await getAuthToken();
      const response = await authApi.delete(`${API_PATH}/${id}`, {
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
};
