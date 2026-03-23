import {
  OpaqueClient,
  getOpaqueConfig,
  OpaqueID,
  RegistrationResponse,
} from "@cloudflare/opaque-ts";
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
   * Unified password setup/change method
   */
  async setup(password: string) {
    try {
      const token = await getAuthToken();
      const cfg = getOpaqueConfig(OpaqueID.OPAQUE_P256);
      const client = new OpaqueClient(cfg);

      // 1. Init
      const registrationRequest = await client.registerInit(password);
      if (registrationRequest instanceof Error) throw registrationRequest;

      const registrationRequestBase64 = btoa(
        String.fromCharCode(...registrationRequest.serialize()),
      );

      // 2. Challenge
      const challengeRes = await authApi.post(
        `${API_PATH}/setup/challenge`,
        { registrationRequest: registrationRequestBase64 },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const registrationResponseBytes = new Uint8Array(
        atob(challengeRes.data.registrationResponse)
          .split("")
          .map((c) => c.charCodeAt(0)),
      );

      const opaqueRegistrationResponse = RegistrationResponse.deserialize(
        cfg,
        Array.from(registrationResponseBytes),
      );

      // 3. Finish
      const registrationFinish = await client.registerFinish(
        opaqueRegistrationResponse,
        "novyse-auth-service",
      );
      if (registrationFinish instanceof Error) throw registrationFinish;

      const registrationRecordBase64 = btoa(
        String.fromCharCode(...registrationFinish.record.serialize()),
      );

      // 4. Complete
      const completeRes = await authApi.post(
        `${API_PATH}/setup/complete`,
        { registrationRecord: registrationRecordBase64 },
        {
          headers: { Authorization: `Bearer ${token}` },
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
