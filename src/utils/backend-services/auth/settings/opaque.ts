import * as opaqueLib from "react-native-opaque";
import { authApi, OPAQUE_SERVER_IDENTITY } from "../../config";
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
   * Unified password setup/change method
   */
  async setup(password: string) {
    try {
      const token = await getAuthToken();
      await opaqueLib.ready;

      // 1. Start Registration
      const { clientRegistrationState, registrationRequest } =
        opaqueLib.client.startRegistration({
          password,
        });

      // 2. Send Registration Request (Challenge)
      const challengeRes = await authApi.post(
        `${API_PATH}/setup/challenge`,
        { registrationRequest },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const registrationResponse = challengeRes.data.registrationResponse;

      if (!registrationResponse) {
        throw new Error("Registration response missing from server");
      }

      // 3. Finish Registration
      const { registrationRecord } = opaqueLib.client.finishRegistration({
        password,
        clientRegistrationState,
        registrationResponse,
        identifiers: {
          server: OPAQUE_SERVER_IDENTITY,
        },
      });

      // 4. Complete Registration on Server
      const completeRes = await authApi.post(
        `${API_PATH}/setup/complete`,
        { registrationRecord },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      return { success: true, data: completeRes.data };
    } catch (error: any) {
      console.error("Settings OPAQUE setup error:", error);
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
