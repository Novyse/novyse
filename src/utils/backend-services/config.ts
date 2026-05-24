import axios from "axios";
import Platform from "@/src/utils/device/type";
import { rpc } from "@/src/utils/electron/rpc";
import * as SecureStore from "expo-secure-store";
import { BRANCH, AUTH_BASE_URL } from "../../../app.config";

// Opaque specific
export const OPAQUE_SERVER_IDENTITY = "novyse-auth-service";

export const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 10000,
});

authApi.interceptors.request.use(
  (config) => {
    if (BRANCH !== "production") {
      console.log(
        `[Auth API] Request: ${config.method?.toUpperCase()} ${config.url}`,
        config.data || "",
      );
    }
    return config;
  },
  (error) => {
    console.error(`[Auth API] Request Error:`, error);
    return Promise.reject(error);
  },
);

authApi.interceptors.response.use(
  async (response) => {
    const newSessionId = response.headers["x-set-session-id"];
    if (newSessionId) {
      switch (Platform) {
        case "desktop": {
          await rpc.request("secureStoreSet", {
            key: "sessionId",
            value: String(newSessionId),
          });
          break;
        }
        case "mobile": {
          await SecureStore.setItemAsync("sessionId", String(newSessionId));
          break;
        }
        case "web":
        default:
          break;
      }
    }

    if (BRANCH !== "production") {
      console.log(
        `[Auth API] Response: ${response.config.method?.toUpperCase()} ${response.config.url}`,
        response.data || "",
      );
    }
    return response;
  },
  (error) => {
    if (BRANCH !== "production") {
      console.error(
        `[Auth API] Response Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        error.response?.data || error.message,
      );
    }
    return Promise.reject(error);
  },
);
